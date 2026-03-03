import { corsHeaders } from "../_shared/cors.ts";
import { getRequesterProfile } from "../_shared/auth.ts";
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

function validatePayload(body: Record<string, unknown>) {
  const coderId = String(body.coder_id ?? "").trim();
  const fullName = String(body.full_name ?? "").trim();
  const nickname = String(body.nickname ?? "").trim();
  const classId = String(body.class_id ?? "").trim();
  const tempPassword = String(body.temp_password ?? "");

  if (!coderId) return { error: "coder_id is required" };
  if (!fullName) return { error: "full_name is required" };
  if (!nickname) return { error: "nickname is required" };
  if (!classId) return { error: "class_id is required" };
  if (tempPassword.length < 8) return { error: "temp_password must be at least 8 characters" };

  return { coderId, fullName, nickname, classId, tempPassword };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await getRequesterProfile(req);
  if ("error" in auth) return json({ error: auth.error }, auth.status);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON payload" }, 400);
  const validated = validatePayload(body as Record<string, unknown>);
  if ("error" in validated) return json({ error: validated.error }, 400);

  const { data: classData, error: classError } = await auth.admin
    .from("classes")
    .select("id, coach_id")
    .eq("id", validated.classId)
    .single();
  if (classError || !classData) return json({ error: "class_id not found" }, 400);

  if (!canCreateCoderForClass(auth.requester.role, auth.requester.id, classData.coach_id)) {
    return json({ error: "Not allowed to create coder for this class" }, 403);
  }

  const email = buildCoderAlias(validated.coderId);

  const { data, error } = await auth.admin.auth.admin.createUser({
    email,
    password: validated.tempPassword,
    email_confirm: true,
  });
  if (error || !data.user) return json({ error: error?.message ?? "Failed to create auth user" }, 400);

  const { error: profileError } = await auth.admin.from("profiles").insert({
    id: data.user.id,
    role: "coder",
    full_name: validated.fullName,
    nickname: validated.nickname,
    email,
    coder_id: validated.coderId,
  });
  if (profileError) {
    await auth.admin.auth.admin.deleteUser(data.user.id);
    return json({ error: profileError.message }, 400);
  }

  const { error: enrollmentError } = await auth.admin.from("class_enrollments").insert({
    class_id: validated.classId,
    coder_id: data.user.id,
    status: "active",
  });
  if (enrollmentError) {
    await auth.admin.from("profiles").delete().eq("id", data.user.id);
    await auth.admin.auth.admin.deleteUser(data.user.id);
    return json({ error: enrollmentError.message }, 400);
  }

  return json({ user_id: data.user.id });
});
