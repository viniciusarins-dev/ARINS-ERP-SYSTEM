import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { backendMode } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type AuthState = {
  status: "loading" | "signedIn" | "signedOut";
  email: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>(backendMode === "local" ? "signedIn" : "loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setStatus(data.session ? "signedIn" : "signedOut");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setStatus(session ? "signedIn" : "signedOut");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      email,
      async signIn(mail, password) {
        if (!supabase) return null;
        const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password });
        if (!error) return null;
        if (error.message.toLowerCase().includes("invalid")) return "E-mail ou senha incorretos.";
        return "Não foi possível entrar. Tente novamente em instantes.";
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
    }),
    [status, email],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
