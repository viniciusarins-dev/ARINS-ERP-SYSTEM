import { describe, expect, it } from "vitest";

import {
  buildOverpassQuery,
  DEFAULT_PROSPECT_MESSAGE,
  filterCandidates,
  parseNominatim,
  parseOverpass,
  renderProspectMessage,
} from "./prospect";

const fixture = {
  elements: [
    { type: "node", id: 1, lat: -26.3, lon: -48.84, tags: { shop: "hairdresser", hairdresser: "barber", name: "Barbearia do Zé", phone: "+55 47 99876-5432", "addr:street": "Rua XV de Novembro", "addr:housenumber": "100", "addr:suburb": "Centro" } },
    { type: "way", id: 2, center: { lat: -26.31, lon: -48.85 }, tags: { shop: "hairdresser", name: "Studio Bella", website: "https://bella.com.br", phone: "(47) 3422-1111" } },
    { type: "node", id: 3, lat: -26.32, lon: -48.86, tags: { shop: "barber", name: "Navalha de Ouro", "contact:instagram": "https://www.instagram.com/navalhadeouro/" } },
    { type: "node", id: 4, lat: -26.33, lon: -48.87, tags: { shop: "hairdresser", name: "The Barber Club", "contact:website": "https://club.example", "contact:whatsapp": "47 99111-2222" } },
    { type: "node", id: 5, lat: -26.34, lon: -48.88, tags: { shop: "hairdresser" } }, // sem nome: ignorado
    { type: "node", id: 6, lat: -26.3, lon: -48.84, tags: { shop: "hairdresser", hairdresser: "barber", name: "Barbearia do Zé" } }, // duplicado
  ],
} as Parameters<typeof parseOverpass>[0];

describe("prospecção", () => {
  const list = parseOverpass(fixture, "Joinville");

  it("monta a consulta com raio limitado", () => {
    const q = buildOverpassQuery(-26.3045, -48.8487, 99999);
    expect(q).toContain('nwr["shop"="hairdresser"](around:30000,-26.304500,-48.848700)');
    expect(q).toContain('nwr["shop"="barber"]');
    expect(q).toContain("out center tags;");
  });

  it("lê empresas, ignora sem nome e duplicadas", () => {
    expect(list.map((c) => c.name)).toEqual(["Barbearia do Zé", "Navalha de Ouro", "Studio Bella", "The Barber Club"]);
  });

  it("classifica barbearia x salão", () => {
    const seg = Object.fromEntries(list.map((c) => [c.name, c.segment]));
    expect(seg["Barbearia do Zé"]).toBe("barbearia");
    expect(seg["Navalha de Ouro"]).toBe("barbearia");
    expect(seg["The Barber Club"]).toBe("barbearia");
    expect(seg["Studio Bella"]).toBe("salao");
  });

  it("extrai telefone, celular, Instagram, site e endereço", () => {
    const ze = list.find((c) => c.name === "Barbearia do Zé")!;
    expect(ze.phone).toBe("47998765432");
    expect(ze.isMobile).toBe(true);
    expect(ze.address).toBe("Rua XV de Novembro, 100 - Centro");
    expect(ze.city).toBe("Joinville");
    expect(ze.website).toBeNull();
    const bella = list.find((c) => c.name === "Studio Bella")!;
    expect(bella.phone).toBe("4734221111");
    expect(bella.isMobile).toBe(false);
    expect(bella.website).toBe("https://bella.com.br");
    expect(list.find((c) => c.name === "Navalha de Ouro")!.instagram).toBe("navalhadeouro");
    expect(list.find((c) => c.name === "The Barber Club")!.phone).toBe("47991112222");
  });

  it("filtra barbearias sem site e com telefone", () => {
    expect(filterCandidates(list, { segment: "barbearia", onlyWithoutSite: true, onlyWithPhone: false }).map((c) => c.name)).toEqual([
      "Barbearia do Zé",
      "Navalha de Ouro",
    ]);
    expect(filterCandidates(list, { segment: "barbearia", onlyWithoutSite: true, onlyWithPhone: true }).map((c) => c.name)).toEqual([
      "Barbearia do Zé",
    ]);
  });

  it("preenche a mensagem de apresentação", () => {
    const msg = renderProspectMessage(DEFAULT_PROSPECT_MESSAGE, { empresa: "Barbearia do Zé", cidade: "Joinville", meu_nome: "Vinicius" });
    expect(msg).toContain("Falo com o responsável pela Barbearia do Zé?");
    expect(msg).toContain("Meu nome é Vinicius, trabalho com criação de sites e sistemas aqui em Joinville.");
    expect(renderProspectMessage("Oi {empresa} de {cidade}", { empresa: "X" })).toBe("Oi X de sua cidade");
  });

  it("lê o resultado do Nominatim", () => {
    expect(parseNominatim([{ display_name: "Joinville, Santa Catarina, Região Sul, Brasil", lat: "-26.30", lon: "-48.84" }])).toEqual([
      { label: "Joinville, Santa Catarina, Região Sul", lat: -26.3, lon: -48.84 },
    ]);
    expect(parseNominatim({ erro: true })).toEqual([]);
  });
});
