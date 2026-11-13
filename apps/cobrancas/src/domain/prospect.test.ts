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
    expect(msg).toContain("Sou Vinicius, da ARMAG. Criamos sites e sistemas para negócios de Joinville e região.");
    expect(renderProspectMessage("Oi {empresa} de {cidade}", { empresa: "X" })).toBe("Oi X de sua cidade");
  });

  it("mensagem padrão segue a ficha aprovada e oferece saída", () => {
    expect(DEFAULT_PROSPECT_MESSAGE).toContain("{meu_nome}");
    expect(DEFAULT_PROSPECT_MESSAGE).toContain("ARMAG");
    expect(DEFAULT_PROSPECT_MESSAGE).toContain("agenda sozinho, 24 horas");
    expect(DEFAULT_PROSPECT_MESSAGE).toContain("Se não tiver interesse, é só me avisar");
    expect(DEFAULT_PROSPECT_MESSAGE).not.toContain("fotos dos cortes");
  });

  it("preenche {bairro} e {segmento}; sem bairro usa a cidade", () => {
    const t = "{empresa} em {bairro} ({segmento})";
    expect(renderProspectMessage(t, { empresa: "X", cidade: "Joinville", bairro: "Saguaçu", segmento: "salao" })).toBe("X em Saguaçu (salão)");
    expect(renderProspectMessage(t, { empresa: "X", cidade: "Joinville", segmento: "barbearia" })).toBe("X em Joinville (barbearia)");
    expect(renderProspectMessage(DEFAULT_PROSPECT_MESSAGE, { empresa: "Barbearia do Zé", cidade: "Joinville", bairro: "Centro", meu_nome: "Vinicius" }))
      .toContain("Vi que a Barbearia do Zé, aqui em Centro, ainda não tem site próprio.");
  });

  it("lê o resultado do Nominatim", () => {
    expect(parseNominatim([{ display_name: "Joinville, Santa Catarina, Região Sul, Brasil", lat: "-26.30", lon: "-48.84" }])).toEqual([
      { label: "Joinville, Santa Catarina, Região Sul", lat: -26.3, lon: -48.84 },
    ]);
    expect(parseNominatim({ erro: true })).toEqual([]);
  });
});

describe("leads de hoje e bairro", () => {
  it("leadsDeHoje usa a data de São Paulo e mantém os mais novos primeiro", async () => {
    const { leadsDeHoje } = await import("./prospect");
    const l = (id: string, createdAt: string) => ({ id, createdAt });
    const r = leadsDeHoje([l("a", "2026-11-13T02:59:00Z"), l("b", "2026-11-13T03:00:00Z"), l("c", "2026-11-14T02:00:00Z"), l("d", "2026-11-13T18:00:00Z")], "2026-11-13");
    expect(r.map((x) => x.id)).toEqual(["c", "d", "b"]);
  });
  it("bairroDoEndereco", async () => {
    const { bairroDoEndereco } = await import("./prospect");
    expect(bairroDoEndereco("Rua A, 10 - Saguaçu, Joinville - SC, 89221-000, Brasil")).toBe("Saguaçu");
    expect(bairroDoEndereco("Rua A - Centro")).toBeNull();
    expect(bairroDoEndereco(null)).toBeNull();
  });
});
