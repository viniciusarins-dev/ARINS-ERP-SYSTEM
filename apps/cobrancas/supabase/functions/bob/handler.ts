/**
 * Serviço "bob": prospecção da ARMAG (Google Places → armag.leads).
 * Chamado pelo Atalho do iPhone ("Olá, Bob"), pelo MCP `armag` e pelo painel.
 * Tudo injetado (fetch, env, data) para ser testável fora do Deno.
 */
import { consultaPlaces, parsePlaces, PLACES_FIELD_MASK, selecionar, type PlaceCandidate, type PlaceSegment } from "../../../src/domain/places";
import { fraseErro, fraseResultado, interpretarPedido, MAX_QUANTIDADE, PADRAO_QUANTIDADE } from "../../../src/domain/pedido";
import { bairroDoEndereco, DEFAULT_PROSPECT_MESSAGE, LEAD_STATUSES, renderProspectMessage, type LeadStatus } from "../../../src/domain/prospect";
import { normalizePhone, whatsappLink } from "../../../src/domain/phone";

export type Env = {
  BOB_TOKEN: string;
  GOOGLE_PLACES_KEY: string;
  SUPABASE_URL: string;
  SERVICE_KEY: string;
  PAINEL_URL: string;
  VIDEO_URL: string;
};
export type Deps = { fetch: typeof globalThis.fetch; env: Env; hoje: string };
export type Resposta = { status: number; json: unknown };

const LIMITE_AVISO = 300;
const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const SEGMENTOS: PlaceSegment[] = ["barbearia", "salao"];

class ErroBusca extends Error {}
const r = (status: number, json: unknown): Resposta => ({ status, json });
const erro400 = (msg: string) => r(400, { erro: msg });

function db(deps: Deps) {
  const base = `${deps.env.SUPABASE_URL}/rest/v1`;
  const headers = (extra: Record<string, string> = {}) => ({
    apikey: deps.env.SERVICE_KEY,
    Authorization: `Bearer ${deps.env.SERVICE_KEY}`,
    "Accept-Profile": "armag",
    "Content-Profile": "armag",
    "Content-Type": "application/json",
    ...extra,
  });
  async function call<T>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
    const rsp = await deps.fetch(`${base}/${path}`, {
      method: init.method ?? "GET",
      headers: headers(init.prefer ? { Prefer: init.prefer } : {}),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!rsp.ok) throw new Error(`banco: ${init.method ?? "GET"} ${path.split("?")[0]} falhou (${rsp.status}): ${await rsp.text()}`);
    const texto = await rsp.text();
    return (texto ? JSON.parse(texto) : null) as T;
  }
  return { call };
}

async function existentes(deps: Deps) {
  const { call } = db(deps);
  const [leads, clients] = await Promise.all([
    call<{ source_ref: string | null; phone: string | null }[]>("leads?select=source_ref,phone"),
    call<{ whatsapp: string }[]>("clients?select=whatsapp"),
  ]);
  const refs = new Set(leads.map((l) => l.source_ref).filter((x): x is string => !!x));
  const fones = new Set([...leads.map((l) => l.phone), ...clients.map((c) => c.whatsapp)].filter((x): x is string => !!x).map(normalizePhone));
  return { refs, fones };
}

const mesDe = (hoje: string) => hoje.slice(0, 7);

async function contarBuscas(deps: Deps, qtd: number): Promise<number> {
  return db(deps).call<number>("rpc/bump_prospect_usage", { method: "POST", body: { p_mes: mesDe(deps.hoje), p_qtd: qtd } });
}

async function usoAtual(deps: Deps): Promise<number> {
  const rows = await db(deps).call<{ buscas: number }[]>(`prospect_usage?select=buscas&mes=eq.${mesDe(deps.hoje)}`);
  return rows[0]?.buscas ?? 0;
}

const aviso = (uso: number) =>
  uso > LIMITE_AVISO ? { aviso_cota: `Já foram ${uso} buscas no Google este mês (aviso a partir de ${LIMITE_AVISO}). Confira o uso no Google Cloud.` } : {};

async function buscarGoogle(deps: Deps, segmentos: PlaceSegment[], regiao: string): Promise<PlaceCandidate[]> {
  if (!deps.env.GOOGLE_PLACES_KEY) throw new ErroBusca("chave do Google não configurada");
  const todos: PlaceCandidate[] = [];
  for (const s of segmentos) {
    const rsp = await deps.fetch(PLACES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": deps.env.GOOGLE_PLACES_KEY, "X-Goog-FieldMask": PLACES_FIELD_MASK },
      body: JSON.stringify(consultaPlaces(s, regiao)),
    });
    if (!rsp.ok) throw new ErroBusca(`Google Places respondeu ${rsp.status}`);
    todos.push(...parsePlaces((await rsp.json()) as { places?: never[] }, s));
  }
  return todos;
}

/** Busca e escolhe; conta as buscas só se todas deram certo. */
async function buscarEscolher(deps: Deps, segmentos: PlaceSegment[], regiao: string, n: number) {
  const brutos = await buscarGoogle(deps, segmentos, regiao);
  const uso = await contarBuscas(deps, segmentos.length);
  return { escolhidos: selecionar(brutos, await existentes(deps), n), uso };
}

function linhaDoLead(c: PlaceCandidate) {
  return {
    name: c.name.slice(0, 160),
    segment: c.segment,
    phone: c.phone && /^[0-9]{10,11}$/.test(c.phone) ? c.phone : null,
    website: c.website?.slice(0, 300) ?? null,
    address: c.address?.slice(0, 300) ?? null,
    city: c.city?.slice(0, 120) ?? null,
    lat: c.lat,
    lon: c.lon,
    source: "google",
    source_ref: c.ref,
    status: "novo",
    notes: `Google: nota ${c.rating ?? "–"} (${c.ratings} avaliações)${c.isMobile ? "" : " · telefone fixo, pode não ter WhatsApp"}${c.mapsUrl ? ` · ${c.mapsUrl}` : ""}`,
  };
}

async function salvar(deps: Deps, cands: PlaceCandidate[]) {
  if (!cands.length) return [];
  return db(deps).call<Record<string, unknown>[]>("leads?select=*", { method: "POST", body: cands.map(linhaDoLead), prefer: "return=representation" });
}

const quantidade = (q: unknown) => Math.min(MAX_QUANTIDADE, Math.max(1, Number.isFinite(Number(q)) && q !== undefined ? Math.trunc(Number(q)) : PADRAO_QUANTIDADE));
const segmentosDe = (s: unknown): PlaceSegment[] => (s === "barbearia" || s === "salao" ? [s] : SEGMENTOS);

function candidatoValido(c: unknown): c is PlaceCandidate {
  const x = c as PlaceCandidate;
  return !!x && typeof x.ref === "string" && x.ref.startsWith("google:") && typeof x.name === "string" && !!x.name.trim() && (x.segment === "barbearia" || x.segment === "salao");
}

export async function handle(req: { token: string | null; body: unknown }, deps: Deps): Promise<Resposta> {
  if (!deps.env.BOB_TOKEN || !req.token || req.token !== deps.env.BOB_TOKEN) return r(401, { erro: "não autorizado" });
  const b = (req.body ?? {}) as Record<string, unknown>;
  try {
    switch (b.acao) {
      case "pedido": {
        const p = interpretarPedido(String(b.texto ?? ""));
        let criados: Record<string, unknown>[];
        let uso: number;
        try {
          const res = await buscarEscolher(deps, p.segmentos, p.regiao, p.quantidade);
          uso = res.uso;
          criados = await salvar(deps, res.escolhidos);
        } catch (e) {
          if (e instanceof ErroBusca) return r(200, { falar: fraseErro(), criados: [], erro: e.message });
          throw e;
        }
        return r(200, {
          falar: fraseResultado({ pedidos: p.quantidade, criados: criados.length, segmentos: p.segmentos, regiao: p.regiao }),
          criados,
          url: `${deps.env.PAINEL_URL}/prospeccao?hoje=1`,
          ...aviso(uso),
        });
      }
      case "buscar": {
        try {
          const res = await buscarEscolher(deps, segmentosDe(b.segmento), String(b.regiao || "Joinville SC"), quantidade(b.quantidade));
          return r(200, { candidatos: res.escolhidos, ...aviso(res.uso) });
        } catch (e) {
          if (e instanceof ErroBusca) return r(502, { erro: e.message });
          throw e;
        }
      }
      case "salvar": {
        const lista = Array.isArray(b.candidatos) ? b.candidatos : null;
        if (!lista || !lista.every(candidatoValido)) return erro400("candidatos inválidos (use os itens devolvidos por 'buscar')");
        const ex = await existentes(deps);
        const novos = lista.filter((c) => !ex.refs.has(c.ref) && !(c.phone && ex.fones.has(normalizePhone(c.phone)))).slice(0, MAX_QUANTIDADE);
        const rows = await salvar(deps, novos);
        return r(200, { ids: rows.map((x) => x.id), ignorados: lista.length - novos.length });
      }
      case "mensagem": {
        if (typeof b.lead_id !== "string" || !b.lead_id) return erro400("informe lead_id");
        const { call } = db(deps);
        const [leads, settings] = await Promise.all([
          call<{ id: string; name: string; segment: string; phone: string | null; city: string | null; address: string | null }[]>(
            `leads?select=id,name,segment,phone,city,address&id=eq.${encodeURIComponent(b.lead_id)}`,
          ),
          call<{ key: string; value: { text?: string } }[]>("settings?select=key,value"),
        ]);
        const lead = leads[0];
        if (!lead) return r(404, { erro: "lead não encontrado" });
        const conf = new Map(settings.map((s) => [s.key, s.value?.text ?? null]));
        const texto = renderProspectMessage(conf.get("prospect_message") || DEFAULT_PROSPECT_MESSAGE, {
          empresa: lead.name,
          cidade: lead.city,
          bairro: bairroDoEndereco(lead.address),
          segmento: lead.segment,
          meu_nome: conf.get("my_name") || "Vinicius",
        });
        const anexar = lead.segment === "barbearia" || lead.segment === "salao";
        return r(200, {
          texto,
          link_whatsapp: lead.phone ? whatsappLink(lead.phone, texto) : null,
          anexar_video: anexar,
          video_url: anexar ? deps.env.VIDEO_URL : null,
        });
      }
      case "marcar_status": {
        const ids = Array.isArray(b.lead_ids) ? b.lead_ids.filter((x): x is string => typeof x === "string" && /^[0-9a-zA-Z-]{1,64}$/.test(x)) : [];
        if (!ids.length) return erro400("informe lead_ids");
        if (!LEAD_STATUSES.includes(b.status as LeadStatus)) return erro400(`status inválido (use ${LEAD_STATUSES.join(", ")})`);
        const patch: Record<string, unknown> = { status: b.status };
        if (b.status === "contatado") patch.last_contact_at = deps.hoje;
        if (typeof b.nota === "string" && b.nota.trim()) patch.notes = b.nota.slice(0, 4000);
        await db(deps).call(`leads?id=in.(${ids.join(",")})`, { method: "PATCH", body: patch, prefer: "return=minimal" });
        return r(200, { ok: true });
      }
      case "listar": {
        const limite = Math.min(100, Math.max(1, Number(b.limite) || 20));
        const filtro = LEAD_STATUSES.includes(b.status as LeadStatus) ? `&status=eq.${b.status}` : "";
        const leads = await db(deps).call(`leads?select=*&order=created_at.desc&limit=${limite}${filtro}`);
        return r(200, { leads, buscas_no_mes: await usoAtual(deps) });
      }
      default:
        return erro400("ação desconhecida (use pedido, buscar, salvar, mensagem, marcar_status ou listar)");
    }
  } catch (e) {
    return r(500, { erro: e instanceof Error ? e.message : String(e), falar: fraseErro() });
  }
}
