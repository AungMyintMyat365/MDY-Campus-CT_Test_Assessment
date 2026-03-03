const rawAllowedOrigin = Deno.env.get("ALLOWED_ORIGIN");
const allowedOrigin = rawAllowedOrigin && rawAllowedOrigin.trim() ? rawAllowedOrigin.trim() : "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
