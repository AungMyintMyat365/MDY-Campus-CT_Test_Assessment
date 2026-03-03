import { corsHeaders } from "../_shared/cors.ts";
import { getRequesterProfile } from "../_shared/auth.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validatePayload(body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const tempPassword = String(body.temp_password ?? "");
  const fullName = String(body.full_name ?? "").trim();
  const nickname = String(body.nickname ?? "").trim();

  if (!email || !email.includes("@")) return { error: "Valid email is required" };
  if (tempPassword.length < 8) return { error: "temp_password must be at least 8 characters" };
  if (!fullName) return { error: "full_name is required" };
  if (!nickname) return { error: "nickname is required" };

  return { email, tempPassword, fullName, nickname };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await getRequesterProfile(req);
  if ("error" in auth) return json({ error: auth.error }, auth.status);
  if (auth.requester.role !== "center_lead") {
    return json({ error: "Only center_lead can create coach accounts" }, 403);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON payload" }, 400);

  const validated = validatePayload(body as Record<string, unknown>);
  if ("error" in validated) return json({ error: validated.error }, 400);

  const { data, error } = await auth.admin.auth.admin.createUser({
    email: validated.email,
    password: validated.tempPassword,
    email_confirm: true,
  });
  if (error || !data.user) return json({ error: error?.message ?? "Failed to create auth user" }, 400);

  const { error: profileError } = await auth.admin.from("profiles").insert({
    id: data.user.id,
    role: "coach",
    full_name: validated.fullName,
    nickname: validated.nickname,
    email: validated.email,
  });

  if (profileError) {
    await auth.admin.auth.admin.deleteUser(data.user.id);
    return json({ error: profileError.message }, 400);
  }

  return json({ user_id: data.user.id });
});
