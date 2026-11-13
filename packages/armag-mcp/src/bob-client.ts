// Cliente do serviço "bob" (Supabase Edge Function da ARMAG).
// O cabeçalho X-Bob-Token vem de BOB_TOKEN quando definido; na sessão do Claude, o proxy o injeta.
export const BOB_URL = process.env.BOB_URL || "https://gxrvtdlcdqpirojyibbm.supabase.co/functions/v1/bob";

export type Acao = "pedido" | "buscar" | "salvar" | "mensagem" | "marcar_status" | "listar";

export async function chamarBob(
  acao: Acao,
  dados: Record<string, unknown>,
  opts: { fetch?: typeof globalThis.fetch; token?: string } = {},
): Promise<unknown> {
  const f = opts.fetch ?? globalThis.fetch;
  const token = opts.token ?? process.env.BOB_TOKEN;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Bob-Token"] = token;
  const rsp = await f(BOB_URL, { method: "POST", headers, body: JSON.stringify({ acao, ...dados }) });
  let json: unknown = null;
  try { json = await rsp.json(); } catch { /* sem corpo */ }
  if (rsp.status === 401) throw new Error("serviço bob recusou o token (X-Bob-Token ausente ou errado) — confira a credencial do host gxrvtdlcdqpirojyibbm.supabase.co");
  if (!rsp.ok) throw new Error(`serviço bob: ${(json as { erro?: string } | null)?.erro ?? `HTTP ${rsp.status}`}`);
  return json;
}
