import { supabase } from "./supabaseClient";

export async function signInCoachOrLead({ email, password }) {
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
  const email = buildCoderAlias(coderId);
  return supabase.auth.signInWithPassword({ email, password });
}
