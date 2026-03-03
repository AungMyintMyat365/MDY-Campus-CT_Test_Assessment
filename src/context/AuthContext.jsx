import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { signInCoachOrLead, signInCoder } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, email, coder_id")
      .eq("id", userId)
      .single();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data);
  }

  async function loginEmail(email, password) {
    return signInCoachOrLead({ email, password });
  }

  async function loginCoder(coderId, password) {
    return signInCoder({ coderId, password });
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      loginEmail,
      loginCoder,
      logout,
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
