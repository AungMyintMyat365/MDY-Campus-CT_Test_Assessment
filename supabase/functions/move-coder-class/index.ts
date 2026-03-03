import { corsHeaders } from "../_shared/cors.ts";
import { getRequesterProfile } from "../_shared/auth.ts";
import { canMoveCoderFromClass } from "../_shared/authz.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validatePayload(body: Record<string, unknown>) {
  const coderProfileId = String(body.coder_profile_id ?? "").trim();
  const toClassId = String(body.to_class_id ?? "").trim();
  const reasonValue = body.reason;
  const reason = typeof reasonValue === "string" ? reasonValue.trim() : null;

  if (!coderProfileId) return { error: "coder_profile_id is required" };
  if (!toClassId) return { error: "to_class_id is required" };

  return { coderProfileId, toClassId, reason };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await getRequesterProfile(req);
  if ("error" in auth) return json({ error: auth.error }, auth.status);
  if (auth.requester.role !== "center_lead" && auth.requester.role !== "coach") {
    return json({ error: "Only center_lead or coach can move coders" }, 403);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON payload" }, 400);
  const validated = validatePayload(body as Record<string, unknown>);
  if ("error" in validated) return json({ error: validated.error }, 400);

  const { data: activeEnrollment, error: activeEnrollmentError } = await auth.admin
    .from("class_enrollments")
    .select("class_id, coder_id, status")
    .eq("coder_id", validated.coderProfileId)
    .eq("status", "active")
    .single();
  if (activeEnrollmentError || !activeEnrollment) {
    return json({ error: "Active enrollment for coder not found" }, 400);
  }

  const { data: fromClass, error: fromClassError } = await auth.admin
    .from("classes")
    .select("id, coach_id")
    .eq("id", activeEnrollment.class_id)
    .single();
  if (fromClassError || !fromClass) return json({ error: "Source class not found" }, 400);

  if (!canMoveCoderFromClass(auth.requester.role, auth.requester.id, fromClass.coach_id)) {
    return json({ error: "You can only move coders from your own class" }, 403);
  }

  if (validated.toClassId === fromClass.id) {
    return json({ error: "to_class_id must be different from current class" }, 400);
  }

  const { data: destinationClass, error: destinationClassError } = await auth.admin
    .from("classes")
    .select("id")
    .eq("id", validated.toClassId)
    .single();
  if (destinationClassError || !destinationClass) {
    return json({ error: "Destination class not found" }, 400);
  }

  const timestamp = new Date().toISOString();

  const { error: closeEnrollmentError } = await auth.admin
    .from("class_enrollments")
    .update({ status: "moved_out", left_at: timestamp })
    .eq("class_id", fromClass.id)
    .eq("coder_id", validated.coderProfileId)
    .eq("status", "active");
  if (closeEnrollmentError) return json({ error: closeEnrollmentError.message }, 400);

  const { error: newEnrollmentError } = await auth.admin.from("class_enrollments").insert({
    class_id: validated.toClassId,
    coder_id: validated.coderProfileId,
    status: "active",
  });
  if (newEnrollmentError) return json({ error: newEnrollmentError.message }, 400);

  const { error: transferError } = await auth.admin.from("coder_transfers").insert({
    coder_id: validated.coderProfileId,
    from_class_id: fromClass.id,
    to_class_id: validated.toClassId,
    reason: validated.reason,
    moved_by: auth.requester.id,
    moved_at: timestamp,
  });
  if (transferError) return json({ error: transferError.message }, 400);

  return json({ ok: true });
});
