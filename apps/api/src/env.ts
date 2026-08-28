function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  // Only needed by the fiscal webhook (Focus NFe calls us with no user JWT,
  // so that route is the one legitimate place a privileged client is used).
  // Left unset in development until fiscal is actually wired up.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  // Fiscal (Focus NFe) — optional until an organization actually configures
  // fiscal documents. Routes that need these check at request time and
  // return 503 rather than crashing the whole API on boot.
  focusNfeApiToken: process.env.FOCUS_NFE_API_TOKEN,
  focusNfeBaseUrl: process.env.FOCUS_NFE_BASE_URL ?? "https://homologacao.focusnfe.com.br",
  focusNfeWebhookSecret: process.env.FOCUS_NFE_WEBHOOK_SECRET,
};
