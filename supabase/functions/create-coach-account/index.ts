import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // TODO: implement full validation and center_lead role check.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const body = await req.json();
  const { email, temp_password, full_name } = body;

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
    role: "coach",
    full_name,
    email,
  });

  return new Response(JSON.stringify({ user_id: data.user.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
