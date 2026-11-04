const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const forceLocal = import.meta.env.VITE_LOCAL_MODE === "true";

/**
 * - "supabase": produção, com login e RLS.
 * - "local": desenvolvimento sem Supabase; dados apenas no navegador.
 * - "misconfigured": build de produção sem variáveis — nunca cai em modo local silenciosamente.
 */
export const backendMode: "supabase" | "local" | "misconfigured" = forceLocal
  ? "local"
  : url && anonKey
    ? "supabase"
    : import.meta.env.DEV
      ? "local"
      : "misconfigured";

export const supabaseConfig = { url: url ?? "", anonKey: anonKey ?? "" };
