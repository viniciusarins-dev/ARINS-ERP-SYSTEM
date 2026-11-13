import { describe, expect, it } from "vitest";
import { handle, type Env } from "./handler";
import { fraseErro } from "../../../src/domain/pedido";

const ENV: Env = {
  BOB_TOKEN: "segredo",
  GOOGLE_PLACES_KEY: "gkey",
  SUPABASE_URL: "https://x.supabase.co",
  SERVICE_KEY: "svc",
  PAINEL_URL: "https://painel.app",
  VIDEO_URL: "https://x.supabase.co/storage/v1/object/public/instagram-armag/prospeccao/video.mp4",
};

const lugar = (id: number, over: Record<string, unknown> = {}) => ({
  id: `p${id}`,
  displayName: { text: `Barbearia ${id}` },
  formattedAddress: "Rua A, 10 - Centro, Joinville - SC, 89201-000, Brasil",
  nationalPhoneNumber: `(47) 99100-00${String(id).padStart(2, "0")}`,
  rating: 4.5,
  userRatingCount: 10 + id,
  businessStatus: "OPERATIONAL",
  ...over,
});

type Call = { url: string; method: string; body: unknown; headers: Record<string, string> };

function falso(opts: { places?: unknown[]; googleStatus?: number; leads?: unknown[]; clients?: unknown[]; uso?: number; settings?: unknown[] } = {}) {
  const calls: Call[] = [];
  let uso = opts.uso ?? 0;
  const inserted: unknown[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ url, method, body, headers: (init.headers ?? {}) as Record<string, string> });
    const ok = (json: unknown, status = 200) => ({ ok: status < 400, status, json: async () => json, text: async () => JSON.stringify(json) });
    if (url.startsWith("https://places.googleapis.com")) {
      if (opts.googleStatus) return ok({ error: { message: "denied" } }, opts.googleStatus);
      return ok({ places: opts.places ?? [] });
    }
    if (url.includes("/rest/v1/rpc/bump_prospect_usage")) { uso += (body as { p_qtd: number }).p_qtd; return ok(uso); }
    if (url.includes("/rest/v1/prospect_usage")) return ok([{ buscas: uso }]);
    if (url.includes("/rest/v1/clients")) return ok(opts.clients ?? []);
    if (url.includes("/rest/v1/settings")) return ok(opts.settings ?? []);
    if (url.includes("/rest/v1/leads") && method === "POST") {
      const rows = (body as Record<string, unknown>[]).map((r, i) => ({ id: `id${inserted.length + i}`, status: "novo", ...r }));
      inserted.push(...rows);
      return ok(rows, 201);
    }
    if (url.includes("/rest/v1/leads") && method === "PATCH") return ok([], 200);
    if (url.includes("/rest/v1/leads")) return ok(opts.leads ?? []);
    throw new Error("inesperado: " + url);
  };
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls, inserted, uso: () => uso };
}

const deps = (f: ReturnType<typeof falso>, env: Partial<Env> = {}) => ({ fetch: f.fetch, env: { ...ENV, ...env }, hoje: "2026-11-13" });

describe("autenticação", () => {
  it("sem token ou token errado → 401 e nenhuma chamada", async () => {
    for (const token of [null, "errado"]) {
      const f = falso();
      const r = await handle({ token, body: { acao: "listar" } }, deps(f));
      expect(r.status).toBe(401);
      expect(f.calls).toHaveLength(0);
    }
  });
  it("BOB_TOKEN vazio no servidor nunca autentica", async () => {
    const f = falso();
    expect((await handle({ token: "", body: { acao: "listar" } }, deps(f, { BOB_TOKEN: "" }))).status).toBe(401);
  });
});

describe("pedido", () => {
  it("cria 5, sem duplicar lead nem cliente, e conta uma busca", async () => {
    const places = [1, 2, 3, 4, 5, 6, 7].map((i) => lugar(i));
    const f = falso({ places, leads: [{ source_ref: "google:p7", phone: null }], clients: [{ whatsapp: "47991000006" }] });
    const r = await handle({ token: "segredo", body: { acao: "pedido", texto: "cinco barbearias" } }, deps(f));
    expect(r.status).toBe(200);
    const j = r.json as { falar: string; criados: { source_ref: string }[]; url: string };
    expect(j.falar.startsWith("Pronto! Criei 5")).toBe(true);
    expect(j.criados.map((c) => c.source_ref)).not.toContain("google:p7");
    expect(j.criados.map((c) => c.source_ref)).not.toContain("google:p6");
    expect(j.criados).toHaveLength(5);
    expect(j.url).toBe("https://painel.app/prospeccao?hoje=1");
    expect(f.uso()).toBe(1);
    const google = f.calls.find((c) => c.url.startsWith("https://places.googleapis.com"))!;
    expect(google.headers["X-Goog-Api-Key"]).toBe("gkey");
    expect((google.body as { textQuery: string }).textQuery).toBe("barbearia em Joinville SC");
    const ins = f.inserted[0] as Record<string, unknown>;
    expect(ins).toMatchObject({ source: "google", segment: "barbearia", status: "novo" });
    expect(String(ins.notes)).toContain("avaliações");
  });
  it("menos que o pedido", async () => {
    const f = falso({ places: [lugar(1), lugar(2)] });
    const r = await handle({ token: "segredo", body: { acao: "pedido", texto: "cinco barbearias" } }, deps(f));
    expect((r.json as { falar: string }).falar.startsWith("Só achei 2")).toBe(true);
  });
  it("erro do Google → frase de erro, nada gravado, uso não sobe", async () => {
    const f = falso({ places: [lugar(1)], googleStatus: 403 });
    const r = await handle({ token: "segredo", body: { acao: "pedido", texto: "cinco" } }, deps(f));
    expect(r.status).toBe(200);
    expect((r.json as { falar: string }).falar).toBe(fraseErro());
    expect(f.inserted).toHaveLength(0);
    expect(f.uso()).toBe(0);
  });
  it("sem chave do Google → mesma frase de erro, sem chamar o Google", async () => {
    const f = falso({ places: [lugar(1)] });
    const r = await handle({ token: "segredo", body: { acao: "pedido", texto: "cinco" } }, deps(f, { GOOGLE_PLACES_KEY: "" }));
    expect((r.json as { falar: string }).falar).toBe(fraseErro());
    expect(f.calls.some((c) => c.url.startsWith("https://places.googleapis.com"))).toBe(false);
  });
  it("aviso de cota acima de 300", async () => {
    const f = falso({ places: [lugar(1)], uso: 300 });
    const r = await handle({ token: "segredo", body: { acao: "pedido", texto: "uma barbearia" } }, deps(f));
    expect((r.json as { aviso_cota?: string }).aviso_cota).toMatch(/301/);
  });
});

describe("mensagem, status e listar", () => {
  it("mensagem com link do WhatsApp e vídeo para barbearia", async () => {
    const lead = { id: "L1", name: "Barbearia Ação", segment: "barbearia", phone: "47991234567", city: "Joinville", address: "Rua A, 10 - Centro, Joinville - SC, 89201-000, Brasil" };
    const f = falso({ leads: [lead], settings: [{ key: "my_name", value: { text: "Vinicius" } }] });
    const r = await handle({ token: "segredo", body: { acao: "mensagem", lead_id: "L1" } }, deps(f));
    const j = r.json as { texto: string; link_whatsapp: string; anexar_video: boolean; video_url: string };
    expect(j.texto).toContain("Sou Vinicius, da ARMAG");
    expect(j.texto).toContain("aqui em Centro");
    expect(j.link_whatsapp.startsWith("https://wa.me/5547991234567?text=")).toBe(true);
    expect(j.link_whatsapp).toContain(encodeURIComponent("Ação"));
    expect(j.anexar_video).toBe(true);
    expect(j.video_url).toBe(ENV.VIDEO_URL);
  });
  it("status inválido → 400", async () => {
    const f = falso();
    expect((await handle({ token: "segredo", body: { acao: "marcar_status", lead_ids: ["a"], status: "xpto" } }, deps(f))).status).toBe(400);
  });
  it("contatado grava a data do contato", async () => {
    const f = falso();
    const r = await handle({ token: "segredo", body: { acao: "marcar_status", lead_ids: ["a", "b"], status: "contatado" } }, deps(f));
    expect(r.status).toBe(200);
    const patch = f.calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toContain("id=in.(a,b)");
    expect(patch.body).toEqual({ status: "contatado", last_contact_at: "2026-11-13" });
  });
  it("ação desconhecida → 400", async () => {
    const f = falso();
    expect((await handle({ token: "segredo", body: { acao: "apagar_tudo" } }, deps(f))).status).toBe(400);
  });
  it("cabeçalhos do PostgREST usam o schema armag e a chave de serviço", async () => {
    const f = falso({ leads: [] });
    await handle({ token: "segredo", body: { acao: "listar", limite: 3 } }, deps(f));
    const c = f.calls[0];
    expect(c.url).toContain("/rest/v1/leads?");
    expect(c.url).toContain("limit=3");
    expect(c.headers["Accept-Profile"]).toBe("armag");
    expect(c.headers.apikey).toBe("svc");
  });
});
