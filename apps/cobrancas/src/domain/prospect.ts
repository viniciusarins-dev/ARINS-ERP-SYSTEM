/**
 * Prospecção de empresas a partir do OpenStreetMap (gratuito, sem chave).
 * Funções puras: montagem da consulta, leitura dos resultados e mensagem.
 */
import { normalizePhone, validatePhone } from "./phone";

export type ProspectSegment = "barbearia" | "salao";

export type GeoPlace = { label: string; lat: number; lon: number };

/** Empresa encontrada na busca (ainda não salva como lead). */
export type ProspectCandidate = {
  /** id estável do OpenStreetMap, ex.: "node/123" — evita salvar duplicado */
  ref: string;
  name: string;
  segment: ProspectSegment;
  lat: number;
  lon: number;
  address: string | null;
  city: string | null;
  /** DDD + número, só dígitos (quando houver e for válido) */
  phone: string | null;
  isMobile: boolean;
  instagram: string | null;
  website: string | null;
  openingHours: string | null;
};

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Consulta Overpass: cabeleireiros/barbearias num raio (metros) ao redor do ponto. */
export function buildOverpassQuery(lat: number, lon: number, radiusMeters: number): string {
  const r = Math.round(Math.min(Math.max(radiusMeters, 500), 30000));
  const around = `around:${r},${lat.toFixed(6)},${lon.toFixed(6)}`;
  return [
    "[out:json][timeout:25];",
    "(",
    `  nwr["shop"="hairdresser"](${around});`,
    `  nwr["shop"="barber"](${around});`,
    `  nwr["amenity"="barbershop"](${around});`,
    ");",
    "out center tags;",
  ].join("\n");
}

const BARBER_NAME = /barb|barber/i;

function classify(tags: Record<string, string>): ProspectSegment {
  if (tags.shop === "barber" || tags.amenity === "barbershop") return "barbearia";
  if (tags.hairdresser === "barber" || /\bmale\b/.test(tags.hairdresser ?? "")) return "barbearia";
  if (BARBER_NAME.test(tags.name ?? "")) return "barbearia";
  return "salao";
}

function websiteOf(tags: Record<string, string>): string | null {
  return tags.website || tags["contact:website"] || tags.url || null;
}

function instagramOf(tags: Record<string, string>): string | null {
  const raw = tags["contact:instagram"] || tags.instagram || null;
  if (!raw) return null;
  const handle = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  return handle || null;
}

function phoneOf(tags: Record<string, string>): { phone: string | null; isMobile: boolean } {
  const candidates = [tags["contact:whatsapp"], tags.mobile, tags["contact:mobile"], tags.phone, tags["contact:phone"]]
    .filter(Boolean)
    .flatMap((v) => v!.split(/[;,/]/));
  for (const c of candidates) {
    const v = validatePhone(c);
    if (v.ok) return { phone: v.national, isMobile: v.national.length === 11 };
  }
  // Número presente mas fora do padrão: guarda os dígitos para conferência manual.
  const digits = candidates.length ? normalizePhone(candidates[0]!) : "";
  return { phone: digits.length >= 10 ? digits : null, isMobile: false };
}

function addressOf(tags: Record<string, string>): string | null {
  const street = tags["addr:street"];
  if (!street) return null;
  const parts = [street + (tags["addr:housenumber"] ? `, ${tags["addr:housenumber"]}` : "")];
  if (tags["addr:suburb"] || tags["addr:neighbourhood"]) parts.push(tags["addr:suburb"] || tags["addr:neighbourhood"]);
  return parts.join(" - ");
}

/** Converte a resposta do Overpass em empresas, sem nome repetido e ordenadas por nome. */
export function parseOverpass(json: { elements?: OsmElement[] }, fallbackCity?: string | null): ProspectCandidate[] {
  const seen = new Set<string>();
  const out: ProspectCandidate[] = [];
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!name || lat === undefined || lon === undefined) continue;
    const dedupeKey = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const { phone, isMobile } = phoneOf(tags);
    out.push({
      ref: `${el.type}/${el.id}`,
      name,
      segment: classify(tags),
      lat,
      lon,
      address: addressOf(tags),
      city: tags["addr:city"] || fallbackCity || null,
      phone,
      isMobile,
      instagram: instagramOf(tags),
      website: websiteOf(tags),
      openingHours: tags.opening_hours || null,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export type CandidateFilter = { segment: ProspectSegment | "todos"; onlyWithoutSite: boolean; onlyWithPhone: boolean };

export function filterCandidates(list: ProspectCandidate[], f: CandidateFilter): ProspectCandidate[] {
  return list.filter(
    (c) =>
      (f.segment === "todos" || c.segment === f.segment) &&
      (!f.onlyWithoutSite || !c.website) &&
      (!f.onlyWithPhone || Boolean(c.phone)),
  );
}

/** Link para conferir a empresa no Google Maps (ver se tem site, avaliações, Instagram). */
export function googleMapsLink(name: string, lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lon}`)}`;
}

export function instagramLink(handle: string): string {
  return `https://instagram.com/${encodeURIComponent(handle)}`;
}

export const DEFAULT_PROSPECT_MESSAGE = [
  "Olá, tudo bem? Falo com o responsável pela {empresa}?",
  "Meu nome é {meu_nome}, trabalho com criação de sites e sistemas aqui em {cidade}.",
  "Vi que a {empresa} ainda não tem um site próprio e preparei uma ideia: um site com agendamento online, fotos dos cortes, valores e botão direto para o WhatsApp — para os clientes acharem a barbearia no Google e agendarem sem precisar ligar.",
  "Posso te mostrar alguns trabalhos que já fiz? Sem compromisso!",
].join("\n\n");

/** Preenche {empresa}, {cidade} e {meu_nome} na mensagem de apresentação. */
export function renderProspectMessage(
  template: string,
  vars: { empresa: string; cidade?: string | null; meu_nome?: string | null },
): string {
  return template
    .replace(/\{empresa\}/g, vars.empresa.trim())
    .replace(/\{cidade\}/g, vars.cidade?.trim() || "sua cidade")
    .replace(/\{meu_nome\}/g, vars.meu_nome?.trim() || "")
    .replace(/[ \t]+([,.!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

export type LeadStatus = "novo" | "contatado" | "interessado" | "proposta" | "fechado" | "sem_interesse";

export const leadStatusLabel: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  interessado: "Interessado",
  proposta: "Proposta enviada",
  fechado: "Fechado",
  sem_interesse: "Sem interesse",
};

export const LEAD_STATUSES: LeadStatus[] = ["novo", "contatado", "interessado", "proposta", "fechado", "sem_interesse"];

/** Raio padrão e limites da busca, em km. */
export const SEARCH_RADIUS = { min: 1, max: 30, default: 8 } as const;

export function parseNominatim(json: unknown): GeoPlace[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((r: { display_name?: string; lat?: string; lon?: string }) => ({
      label: (r.display_name ?? "").split(", ").slice(0, 3).join(", "),
      lat: Number(r.lat),
      lon: Number(r.lon),
    }))
    .filter((p) => p.label && Number.isFinite(p.lat) && Number.isFinite(p.lon));
}
