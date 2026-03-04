const rawAllowedOrigin = Deno.env.get("ALLOWED_ORIGIN");
const allowedOrigin = rawAllowedOrigin && rawAllowedOrigin.trim() ? rawAllowedOrigin.trim() : "http://localhost:5173";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-request-id",
};
