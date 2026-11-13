/**
 * Prospecção pelo Google Places API (New): consulta, leitura da resposta e escolha dos leads.
 * Funções puras — usadas pelo serviço "bob" (Edge Function) e testadas aqui.
 */
import { normalizePhone, validatePhone } from "./phone";

export type PlaceSegment = "barbearia" | "salao";

export type PlaceCandidate = {
  /** "google:<place id>" — gravado em leads.source_ref (único) */
  ref: string;
  name: string;
  segment: PlaceSegment;
  address: string | null;
  bairro: string | null;
  city: string | null;
  /** DDD + número, só dígitos */
  phone: string | null;
  isMobile: boolean;
  website: string | null;
  rating: number | null;
  ratings: number;
  mapsUrl: string | null;
  lat: number | null;
  lon: number | null;
  /** businessStatus do Google (ex.: OPERATIONAL) */
  status: string | null;
};

export const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.googleMapsUri",
  "places.location",
].join(",");

const TERMO: Record<PlaceSegment, string> = { barbearia: "barbearia", salao: "salão de beleza" };

export function consultaPlaces(segment: PlaceSegment, regiao: string) {
  return { textQuery: `${TERMO[segment]} em ${regiao}`, languageCode: "pt-BR" as const, regionCode: "BR" as const, maxResultCount: 20 as const };
}

/** Domínios que não contam como "site próprio" (rede social, agregador de links, WhatsApp). */
const NAO_SITE = ["instagram.com", "facebook.com", "fb.com", "linktr.ee", "wa.me", "api.whatsapp.com", "whatsapp.com", "linkin.bio", "beacons.ai"];

export function temSiteProprio(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  let host: string;
  try {
    host = new URL(url.includes("://") ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  return !NAO_SITE.some((d) => host === d || host.endsWith(`.${d}`));
}

/** "Rua A, 10 - Saguaçu, Joinville - SC, 89221-000, Brasil" → bairro "Saguaçu", cidade "Joinville". */
function bairroECidade(endereco: string | null): { bairro: string | null; city: string | null } {
  if (!endereco) return { bairro: null, city: null };
  const partes = endereco.split(",").map((p) => p.trim());
  const iCidade = partes.findIndex((p) => / - [A-Z]{2}$/.test(p));
  if (iCidade < 0) return { bairro: null, city: null };
  const city = partes[iCidade].replace(/ - [A-Z]{2}$/, "").trim() || null;
  const anterior = iCidade > 0 ? partes[iCidade - 1] : "";
  const bairro = anterior.includes(" - ") ? anterior.split(" - ").pop()!.trim() || null : null;
  return { bairro, city };
}

type PlaceJson = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
};

export function parsePlaces(json: { places?: PlaceJson[] }, segment: PlaceSegment): PlaceCandidate[] {
  const out: PlaceCandidate[] = [];
  for (const p of json.places ?? []) {
    const name = p.displayName?.text?.trim();
    if (!p.id || !name) continue;
    let phone: string | null = null;
    let isMobile = false;
    if (p.nationalPhoneNumber) {
      const v = validatePhone(p.nationalPhoneNumber);
      phone = v.ok ? v.national : normalizePhone(p.nationalPhoneNumber) || null;
      isMobile = v.ok && v.national.length === 11;
    }
    const { bairro, city } = bairroECidade(p.formattedAddress ?? null);
    const c: PlaceCandidate = {
      ref: `google:${p.id}`,
      name,
      segment,
      address: p.formattedAddress ?? null,
      bairro,
      city,
      phone,
      isMobile,
      website: p.websiteUri ?? null,
      rating: p.rating ?? null,
      ratings: p.userRatingCount ?? 0,
      mapsUrl: p.googleMapsUri ?? null,
      lat: p.location?.latitude ?? null,
      lon: p.location?.longitude ?? null,
      status: p.businessStatus ?? null,
    };
    out.push(c);
  }
  return out;
}

export type Existentes = { refs: Set<string>; fones: Set<string> };

/** Mantém só negócios ativos, sem site próprio, com telefone e ≥ 5 avaliações; sem duplicar; mais avaliados primeiro. */
export function selecionar(cands: PlaceCandidate[], existentes: Existentes, n: number): PlaceCandidate[] {
  const vistos = new Set<string>();
  return cands
    .filter((c) => {
      if (c.status !== "OPERATIONAL") return false;
      if (c.ratings < 5 || !c.phone || temSiteProprio(c.website)) return false;
      if (existentes.refs.has(c.ref) || existentes.fones.has(c.phone)) return false;
      if (vistos.has(c.ref) || vistos.has(c.phone)) return false;
      vistos.add(c.ref);
      vistos.add(c.phone);
      return true;
    })
    .sort((a, b) => b.ratings - a.ratings)
    .slice(0, Math.max(0, n));
}
