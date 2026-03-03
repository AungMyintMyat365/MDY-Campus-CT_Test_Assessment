import { supabase, supabaseConfigError } from "./supabaseClient";

function missingConfigResponse() {
  return { data: null, error: new Error(supabaseConfigError ?? "Supabase is not configured") };
}

export async function signInCoachOrLead({ email, password }) {
  if (!supabase) return missingConfigResponse();
  return supabase.auth.signInWithPassword({ email, password });
}

function buildCoderAlias(coderId) {
  const normalized = String(coderId).trim().toLowerCase();
  if (!normalized) {
    throw new Error("Coder ID is required");
  }
  return `coder_${normalized}@school.local`;
}

export async function signInCoder({ coderId, password }) {
  if (!supabase) return missingConfigResponse();
  const email = buildCoderAlias(coderId);
  return supabase.auth.signInWithPassword({ email, password });
}
