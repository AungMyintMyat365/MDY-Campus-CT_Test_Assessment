import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function buildCoderAlias(coderId: string) {
  return `coder_${String(coderId).trim().toLowerCase()}@school.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // TODO: implement role check for coach(class owner) or center_lead.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const body = await req.json();
  const { coder_id, full_name, class_id, temp_password } = body;
  const email = buildCoderAlias(coder_id);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("profiles").insert({
    id: data.user.id,
    role: "coder",
    full_name,
    email,
    coder_id,
  });

  await supabase.from("class_enrollments").insert({
    class_id,
    coder_id: data.user.id,
    status: "active",
  });

  return new Response(JSON.stringify({ user_id: data.user.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
