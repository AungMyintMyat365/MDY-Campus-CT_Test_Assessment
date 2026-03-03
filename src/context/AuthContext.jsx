import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";
import { signInCoachOrLead, signInCoder } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [loading, setLoading] = useState(!supabaseConfigError);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    }

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        setProfileError("");
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, nickname, role, email, coder_id")
      .eq("id", userId)
      .single();

    if (!error) {
      setProfile(data);
      setProfileError("");
      return;
    }

    if (String(error.message || "").includes("nickname")) {
      const fallback = await supabase
        .from("profiles")
        .select("id, full_name, role, email, coder_id")
        .eq("id", userId)
        .single();

      if (!fallback.error) {
        setProfile({ ...fallback.data, nickname: null });
        setProfileError("");
        return;
      }

      setProfile(null);
      setProfileError(fallback.error.message || "Failed to load profile");
      return;
    }

    setProfile(null);
    setProfileError(error.message || "Failed to load profile");
  }

  async function loginEmail(email, password) {
    return signInCoachOrLead({ email, password });
  }

  async function loginCoder(coderId, password) {
    return signInCoder({ coderId, password });
  }

  async function logout() {
    if (!supabase) {
      setSession(null);
      setProfile(null);
      setProfileError("");
      return;
    }

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (_err) {
      // Ignore network/logout API issues; we still clear local auth state below.
    } finally {
      setSession(null);
      setProfile(null);
      setProfileError("");
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_storageErr) {
        // Ignore storage cleanup errors in restricted browser contexts.
      }
    }
  }

  const value = useMemo(
    () => ({
      session,
      profile,
      profileError,
      loading,
      loginEmail,
      loginCoder,
      logout,
      configError: supabaseConfigError,
    }),
    [session, profile, profileError, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
