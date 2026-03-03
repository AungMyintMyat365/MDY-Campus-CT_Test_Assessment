import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // TODO: parse CSV, validate rows, call create-coach-account safely, and return import summary.
  return new Response(JSON.stringify({ message: "import-coaches-csv stub ready" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
