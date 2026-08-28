import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "./supabase";
import { api } from "./api";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "staff";
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  organization: Organization | null;
  /** True while the initial session or the organization lookup is resolving. */
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionLoaded(true);
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    });

    return () => subscription.subscription.unsubscribe();
  }, [queryClient]);

  const { data: organization, isLoading: organizationLoading } = useQuery({
    queryKey: ["organization", session?.user.id],
    queryFn: async () => {
      const result = await api.get<{ organization: Organization | null }>("/api/organizations/me");
      return result.organization;
    },
    enabled: !!session,
  });

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isLoading = !sessionLoaded || (!!session && organizationLoading);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        organization: session ? (organization ?? null) : null,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
