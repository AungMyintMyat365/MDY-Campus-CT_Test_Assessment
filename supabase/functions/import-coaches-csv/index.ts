import { getRequesterProfile } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { parseCsv } from "../_shared/csv.ts";

const ROW_TIMEOUT_MS = 12000;
const DB_TIMEOUT_MS = 15000;
const MAX_ROWS = 200;

function json(body: Record<string, unknown>, requestId: string, status = 200) {
  return new Response(JSON.stringify({ ...body, request_id: requestId }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
  });
}

function getField(row: Record<string, string>, aliases: string[]) {
  for (const key of aliases) {
    const value = row[key];
    if (value !== undefined && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs);
    }),
  ]);
}

Deno.serve(async (req) => {
  const requestId = req.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, requestId, 405);

  console.log(`[${requestId}] import-coaches-csv started`);
  const auth = await getRequesterProfile(req);
  if ("error" in auth) return json({ error: auth.error }, requestId, auth.status);
  if (auth.requester.role !== "center_lead") {
    return json({ error: "Only center_lead can import coaches" }, requestId, 403);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON payload" }, requestId, 400);
  const csv = String((body as Record<string, unknown>).csv ?? "").trim();
  if (!csv) return json({ error: "csv is required" }, requestId, 400);

  const rows = parseCsv(csv);
  if (!rows.length) return json({ error: "CSV has no data rows" }, requestId, 400);
  if (rows.length > MAX_ROWS) {
    return json({ error: `CSV too large (${rows.length} rows). Max allowed is ${MAX_ROWS}.` }, requestId, 400);
  }

  const startedAt = new Date().toISOString();
  let jobId: string | null = null;
  const { data: jobData } = await withTimeout(
    auth.admin
      .from("import_jobs")
      .insert({
        type: "coach_import",
        uploaded_by: auth.requester.id,
        status: "processing",
        summary: { request_id: requestId },
      })
      .select("id")
      .single(),
    DB_TIMEOUT_MS,
    "insert import_jobs"
  );
  jobId = jobData?.id ?? null;

  try {
    let successCount = 0;
    const failures: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const fullName = getField(row, ["full_name", "fullname", "full name"]);
      const nickname = getField(row, ["nickname", "nick_name", "nick name"]);
      const email = getField(row, ["email", "mail"]).toLowerCase();
      const tempPassword = getField(row, ["temp_password", "password", "temp password"]);

      if (!fullName || !nickname || !email || !email.includes("@") || tempPassword.length < 8) {
        failures.push({ row: i + 2, error: "Missing/invalid full_name, nickname, email, or temp_password" });
        continue;
      }

      const { data: created, error: createError } = await withTimeout(
        auth.admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        }),
        ROW_TIMEOUT_MS,
        `createUser row ${i + 2}`
      );
      if (createError || !created.user) {
        failures.push({ row: i + 2, error: createError?.message ?? "Failed to create auth user" });
        continue;
      }

      const { error: profileError } = await withTimeout(
        auth.admin.from("profiles").insert({
          id: created.user.id,
          role: "coach",
          full_name: fullName,
          nickname,
          email,
        }),
        DB_TIMEOUT_MS,
        `insert profile row ${i + 2}`
      );
      if (profileError) {
        await withTimeout(auth.admin.auth.admin.deleteUser(created.user.id), ROW_TIMEOUT_MS, `deleteUser row ${i + 2}`).catch(
          () => null
        );
        failures.push({ row: i + 2, error: profileError.message });
        continue;
      }

      successCount += 1;
    }

    const summary = {
      request_id: requestId,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      total_rows: rows.length,
      success_count: successCount,
      failure_count: failures.length,
      failures,
    };

    if (jobId) {
      await withTimeout(
        auth.admin
          .from("import_jobs")
          .update({
            status: "completed",
            summary,
            finished_at: new Date().toISOString(),
          })
          .eq("id", jobId),
        DB_TIMEOUT_MS,
        "update import_jobs completed"
      );
    }

    console.log(`[${requestId}] import-coaches-csv completed success=${successCount} failed=${failures.length}`);
    return json(summary, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import failure";
    if (jobId) {
      await withTimeout(
        auth.admin
          .from("import_jobs")
          .update({
            status: "failed",
            summary: {
              request_id: requestId,
              started_at: startedAt,
              completed_at: new Date().toISOString(),
              error: message,
            },
            finished_at: new Date().toISOString(),
          })
          .eq("id", jobId),
        DB_TIMEOUT_MS,
        "update import_jobs failed"
      ).catch(() => null);
    }
    console.error(`[${requestId}] import-coaches-csv failed`, error);
    return json({ error: message }, requestId, 500);
  }
});
