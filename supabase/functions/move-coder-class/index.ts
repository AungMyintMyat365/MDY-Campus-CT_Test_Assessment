import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // TODO: enforce authorization checks using JWT user + RLS-safe logic.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const body = await req.json();
  const { coder_profile_id, from_class_id, to_class_id, reason, moved_by } = body;

  await supabase
    .from("class_enrollments")
    .update({ status: "moved_out", left_at: new Date().toISOString() })
    .eq("class_id", from_class_id)
    .eq("coder_id", coder_profile_id)
    .eq("status", "active");

  await supabase.from("class_enrollments").insert({
    class_id: to_class_id,
    coder_id: coder_profile_id,
    status: "active",
  });

  await supabase.from("coder_transfers").insert({
    coder_id: coder_profile_id,
    from_class_id,
    to_class_id,
    reason,
    moved_by,
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
