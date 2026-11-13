// Entrada da Edge Function "bob" (Deno). A lógica está em handler.ts.
// Publicação: scripts/deploy-bob.sh (empacota com esbuild e envia pela Management API).
import { handle } from "./handler";

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Response | Promise<Response>): void };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-bob-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Data de hoje em São Paulo (UTC−3, sem horário de verão). */
const hojeSP = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return Response.json({ erro: "use POST" }, { status: 405, headers: CORS });
  const body = await req.json().catch(() => null);
  const env = (k: string) => Deno.env.get(k) ?? "";
  const res = await handle(
    { token: req.headers.get("x-bob-token"), body },
    {
      fetch: globalThis.fetch.bind(globalThis),
      hoje: hojeSP(),
      env: {
        BOB_TOKEN: env("BOB_TOKEN"),
        GOOGLE_PLACES_KEY: env("GOOGLE_PLACES_KEY"),
        SUPABASE_URL: env("SUPABASE_URL"),
        SERVICE_KEY: env("SUPABASE_SERVICE_ROLE_KEY"),
        PAINEL_URL: env("PAINEL_URL"),
        VIDEO_URL: env("VIDEO_URL"),
      },
    },
  );
  return Response.json(res.json, { status: res.status, headers: CORS });
});
