import { describe, expect, it } from "vitest";
import { consultaPlaces, parsePlaces, PLACES_FIELD_MASK, selecionar, temSiteProprio } from "./places";

const lugar = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  displayName: { text: `Barbearia ${id}`, languageCode: "pt" },
  formattedAddress: "Rua A, 10 - Saguaçu, Joinville - SC, 89221-000, Brasil",
  nationalPhoneNumber: "(47) 99123-45" + id.padStart(2, "0"),
  rating: 4.8,
  userRatingCount: 20,
  businessStatus: "OPERATIONAL",
  googleMapsUri: `https://maps.google.com/?cid=${id}`,
  location: { latitude: -26.28, longitude: -48.83 },
  ...over,
});

describe("temSiteProprio", () => {
  it("rede social não conta como site", () => {
    expect(temSiteProprio("https://instagram.com/x")).toBe(false);
    expect(temSiteProprio("https://www.facebook.com/barbearia")).toBe(false);
    expect(temSiteProprio("https://linktr.ee/x")).toBe(false);
    expect(temSiteProprio("https://wa.me/5547999999999")).toBe(false);
  });
  it("domínio próprio conta; vazio não", () => {
    expect(temSiteProprio("https://barbeariax.com.br")).toBe(true);
    expect(temSiteProprio(null)).toBe(false);
    expect(temSiteProprio("")).toBe(false);
  });
});

describe("consultaPlaces", () => {
  it("monta a busca por segmento e região", () => {
    expect(consultaPlaces("barbearia", "Joinville SC")).toEqual({ textQuery: "barbearia em Joinville SC", languageCode: "pt-BR", regionCode: "BR", maxResultCount: 20 });
    expect(consultaPlaces("salao", "Saguaçu, Joinville SC").textQuery).toBe("salão de beleza em Saguaçu, Joinville SC");
    expect(PLACES_FIELD_MASK).toContain("places.websiteUri");
  });
});

describe("parsePlaces", () => {
  it("normaliza telefone, bairro e cidade", () => {
    const [a, b] = parsePlaces({ places: [lugar("1", { nationalPhoneNumber: "(47) 99123-4567" }), lugar("2", { nationalPhoneNumber: "(47) 3422-1111" })] }, "barbearia");
    expect(a).toMatchObject({ ref: "google:1", name: "Barbearia 1", phone: "47991234567", isMobile: true, bairro: "Saguaçu", city: "Joinville", ratings: 20, rating: 4.8, segment: "barbearia" });
    expect(b.phone).toBe("4734221111");
    expect(b.isMobile).toBe(false);
  });
  it("resposta vazia vira lista vazia", () => {
    expect(parsePlaces({}, "salao")).toEqual([]);
  });
});

describe("selecionar", () => {
  const json = {
    places: [
      lugar("1", { userRatingCount: 50 }),
      lugar("2", { businessStatus: "CLOSED_TEMPORARILY" }),
      lugar("3", { userRatingCount: 4 }),
      lugar("4", { nationalPhoneNumber: undefined }),
      lugar("5", { websiteUri: "https://barbearia5.com.br" }),
      lugar("6", { userRatingCount: 30, websiteUri: "https://instagram.com/b6" }),
      lugar("7", { userRatingCount: 90 }),
      lugar("8", { userRatingCount: 70 }),
      lugar("9", { userRatingCount: 10 }),
    ],
  };
  const cands = parsePlaces(json, "barbearia");
  it("aplica filtros, remove duplicados e ordena por avaliações", () => {
    const fone8 = cands.find((c) => c.ref === "google:8")!.phone!;
    const r = selecionar(cands, { refs: new Set(["google:7"]), fones: new Set([fone8]) }, 10);
    expect(r.map((c) => c.ref)).toEqual(["google:1", "google:6", "google:9"]);
  });
  it("corta na quantidade pedida", () => {
    expect(selecionar(cands, { refs: new Set(), fones: new Set() }, 2).map((c) => c.ref)).toEqual(["google:7", "google:8"]);
  });
});
