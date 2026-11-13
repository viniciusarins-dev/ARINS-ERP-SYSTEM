import { describe, expect, it } from "vitest";
import { fraseErro, fraseResultado, interpretarPedido } from "./pedido";

const AMBOS = ["barbearia", "salao"];

describe("interpretarPedido", () => {
  it.each([
    ["cinco", 5, AMBOS, "Joinville SC"],
    ["5", 5, AMBOS, "Joinville SC"],
    ["quero dez barbearias", 10, ["barbearia"], "Joinville SC"],
    ["vinte", 10, AMBOS, "Joinville SC"],
    ["", 5, AMBOS, "Joinville SC"],
    ["três salões no Saguaçu", 3, ["salao"], "Saguaçu, Joinville SC"],
    ["dois em Araquari", 2, AMBOS, "Araquari SC"],
    ["Um", 1, AMBOS, "Joinville SC"],
    ["uma barbearia", 1, ["barbearia"], "Joinville SC"],
    ["Quatro Barbearias na Zona Sul", 4, ["barbearia"], "Zona Sul, Joinville SC"],
    ["seis em São Francisco do Sul", 6, AMBOS, "São Francisco do Sul SC"],
    ["12 salões e barbearias", 10, AMBOS, "Joinville SC"],
  ])("%s", (texto, quantidade, segmentos, regiao) => {
    expect(interpretarPedido(texto)).toEqual({ quantidade, segmentos, regiao });
  });
});

describe("frases", () => {
  it("resultado completo", () => {
    expect(fraseResultado({ pedidos: 5, criados: 5, segmentos: ["barbearia"], regiao: "Joinville SC" })).toBe(
      "Pronto! Criei 5 leads de barbearias sem site em Joinville e deixei as mensagens prontas.",
    );
  });
  it("um lead, os dois segmentos", () => {
    expect(fraseResultado({ pedidos: 1, criados: 1, segmentos: ["barbearia", "salao"], regiao: "Saguaçu, Joinville SC" })).toBe(
      "Pronto! Criei 1 lead de barbearias e salões sem site no Saguaçu e deixei a mensagem pronta.",
    );
  });
  it("menos que o pedido", () => {
    expect(fraseResultado({ pedidos: 5, criados: 2, segmentos: ["barbearia"], regiao: "Joinville SC" })).toBe(
      "Só achei 2 hoje em Joinville. Já deixei as mensagens prontas.",
    );
  });
  it("nenhum", () => {
    const f = fraseResultado({ pedidos: 5, criados: 0, segmentos: ["salao"], regiao: "Joinville SC" });
    expect(f).toContain("não encontrei");
    expect(f).toContain("outra região");
  });
  it("erro", () => expect(fraseErro()).toContain("não consegui buscar"));
});
