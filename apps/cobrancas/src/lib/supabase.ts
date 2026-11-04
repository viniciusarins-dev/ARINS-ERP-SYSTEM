import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { backendMode, supabaseConfig } from "./env";

/** Cliente com a chave pública (anon). A segurança é garantida pelas políticas RLS. */
export const supabase: SupabaseClient | null =
  backendMode === "supabase"
    ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;
