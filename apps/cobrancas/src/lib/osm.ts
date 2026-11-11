import { buildOverpassQuery, parseNominatim, parseOverpass, type GeoPlace, type ProspectCandidate } from "@/domain/prospect";

/**
 * Busca no OpenStreetMap direto do navegador (serviços públicos e gratuitos).
 * Uso moderado: uma busca por vez, disparada pelo usuário.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
/** Servidores Overpass públicos: se um falhar ou estiver ocupado, tenta o próximo. */
const OVERPASS_SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

export async function geocodeCity(query: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  const url = `${NOMINATIM}?${new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "br",
    "accept-language": "pt-BR",
  })}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Não foi possível localizar a cidade agora.");
  return parseNominatim(await res.json());
}

export async function searchBusinesses(place: GeoPlace, radiusKm: number, signal?: AbortSignal): Promise<ProspectCandidate[]> {
  const query = buildOverpassQuery(place.lat, place.lon, radiusKm * 1000);
  const city = place.label.split(", ")[0] ?? null;
  let busy = false;
  for (const server of OVERPASS_SERVERS) {
    try {
      const res = await fetch(server, { method: "POST", body: new URLSearchParams({ data: query }), signal });
      if (res.ok) return parseOverpass(await res.json(), city);
      if (res.status === 429 || res.status >= 500) busy = true;
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      // falha de rede neste servidor: tenta o próximo
    }
  }
  throw new Error(
    busy
      ? "O serviço de mapas está ocupado. Aguarde alguns segundos e tente de novo."
      : "Não foi possível buscar empresas agora. Verifique a conexão e tente de novo.",
  );
}
