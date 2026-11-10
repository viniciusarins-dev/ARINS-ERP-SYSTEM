import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { backendMode } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type AuthState = {
  status: "loading" | "signedIn" | "signedOut";
  email: string | null;
  /** Conta criada com senha provisória: precisa definir uma senha própria antes de usar o sistema. */
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Troca a senha do usuário logado. Devolve uma mensagem de erro ou null. */
  changePassword: (newPassword: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

function mustChange(session: Session | null): boolean {
  return session?.user.user_metadata?.must_change_password === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>(backendMode === "local" ? "signedIn" : "loading");
  const [email, setEmail] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const apply = (session: Session | null) => {
      setEmail(session?.user.email ?? null);
      setMustChangePassword(mustChange(session));
      setStatus(session ? "signedIn" : "signedOut");
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      email,
      mustChangePassword,
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
      async changePassword(newPassword) {
        if (!supabase) return null;
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
          data: { must_change_password: false },
        });
        if (!error) {
          setMustChangePassword(false);
          return null;
        }
        const msg = error.message.toLowerCase();
        if (msg.includes("different from the old")) return "A nova senha precisa ser diferente da atual.";
        if (msg.includes("weak") || msg.includes("at least")) return "Senha fraca. Use pelo menos 8 caracteres com letras e números.";
        if (msg.includes("reauthentication")) return "Por segurança, saia e entre novamente antes de trocar a senha.";
        return "Não foi possível alterar a senha. Tente novamente.";
      },
    }),
    [status, email, mustChangePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
