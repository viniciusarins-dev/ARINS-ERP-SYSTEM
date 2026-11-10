import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { backendMode, supabaseConfig } from "./env";

// O schema do ARMAG é escolhido em tempo de execução (armag), por isso os genéricos ficam abertos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArmagClient = SupabaseClient<any, any, any>;

/** Cliente com a chave pública (anon). A segurança é garantida pelas políticas RLS. */
export const supabase: ArmagClient | null =
  backendMode === "supabase"
    ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
        db: { schema: supabaseConfig.schema },
      })
    : null;
