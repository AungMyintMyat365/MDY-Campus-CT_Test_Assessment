import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getSupabaseClients() {
  const url = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceRoleKey);
  const authClient = createClient(url, anonKey);

  return { admin, authClient };
}

export function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export async function getRequesterProfile(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return { error: "Missing Bearer token", status: 401 as const };
  }

  const { admin, authClient } = getSupabaseClients();
  let { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    const fallback = await authClient.auth.getUser(token);
    userData = fallback.data;
    userError = fallback.error;
  }
  if (userError || !userData?.user) {
    return { error: userError?.message ?? "Invalid auth token", status: 401 as const };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Requester profile not found", status: 403 as const };
  }
  if (!profile.is_active) {
    return { error: "Requester account is inactive", status: 403 as const };
  }

  return { admin, requester: profile };
}
