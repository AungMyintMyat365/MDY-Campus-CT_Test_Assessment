import { getRequesterProfile } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { parseCsv } from "../_shared/csv.ts";
import { canCreateCoderForClass } from "../_shared/authz.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildCoderAlias(coderId: string) {
  return `coder_${String(coderId).trim().toLowerCase()}@school.local`;
}

function getField(row: Record<string, string>, aliases: string[]) {
  for (const key of aliases) {
    const value = row[key];
    if (value !== undefined && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await getRequesterProfile(req);
  if ("error" in auth) return json({ error: auth.error }, auth.status);
  if (auth.requester.role !== "center_lead" && auth.requester.role !== "coach") {
    return json({ error: "Only center_lead or coach can import coders" }, 403);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON payload" }, 400);
  const csv = String((body as Record<string, unknown>).csv ?? "").trim();
  if (!csv) return json({ error: "csv is required" }, 400);

  const rows = parseCsv(csv);
  if (!rows.length) return json({ error: "CSV has no data rows" }, 400);

  const startedAt = new Date().toISOString();
  const { data: jobData } = await auth.admin
    .from("import_jobs")
    .insert({
      type: "coder_import",
      uploaded_by: auth.requester.id,
      status: "processing",
    })
    .select("id")
    .single();

  let successCount = 0;
  const failures: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const fullName = getField(row, ["full_name", "fullname", "full name"]);
    const nickname = getField(row, ["nickname", "nick_name", "nick name"]);
    const coderId = getField(row, ["coder_id", "coderid", "coder id", "student_id", "student id"]);
    const classId = getField(row, ["class_id", "classid", "class id"]);
    const tempPassword = getField(row, ["temp_password", "password", "temp password"]);

    if (!fullName || !nickname || !coderId || !classId || tempPassword.length < 8) {
      failures.push({ row: i + 2, error: "Missing/invalid full_name, nickname, coder_id, class_id, or temp_password" });
      continue;
    }

    const { data: classData, error: classError } = await auth.admin
      .from("classes")
      .select("id, coach_id")
      .eq("id", classId)
      .single();
    if (classError || !classData) {
      failures.push({ row: i + 2, error: "class_id not found" });
      continue;
    }

    if (!canCreateCoderForClass(auth.requester.role, auth.requester.id, classData.coach_id)) {
      failures.push({ row: i + 2, error: "Not allowed to import coder into this class" });
      continue;
    }

    const email = buildCoderAlias(coderId);
    const { data: created, error: createError } = await auth.admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createError || !created.user) {
      failures.push({ row: i + 2, error: createError?.message ?? "Failed to create auth user" });
      continue;
    }

    const { error: profileError } = await auth.admin.from("profiles").insert({
      id: created.user.id,
      role: "coder",
      full_name: fullName,
      nickname,
      email,
      coder_id: coderId,
    });
    if (profileError) {
      await auth.admin.auth.admin.deleteUser(created.user.id);
      failures.push({ row: i + 2, error: profileError.message });
      continue;
    }

    const { error: enrollmentError } = await auth.admin.from("class_enrollments").insert({
      class_id: classId,
      coder_id: created.user.id,
      status: "active",
    });
    if (enrollmentError) {
      await auth.admin.from("profiles").delete().eq("id", created.user.id);
      await auth.admin.auth.admin.deleteUser(created.user.id);
      failures.push({ row: i + 2, error: enrollmentError.message });
      continue;
    }

    successCount += 1;
  }

  const summary = {
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    total_rows: rows.length,
    success_count: successCount,
    failure_count: failures.length,
    failures,
  };

  if (jobData?.id) {
    await auth.admin
      .from("import_jobs")
      .update({
        status: "completed",
        summary,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobData.id);
  }

  return json(summary);
});
