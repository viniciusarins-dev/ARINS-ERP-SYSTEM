import { describe, expect, it } from "vitest";

import { buildChargeMessage } from "./message";

const base = {
  clientName: "João Pereira",
  projectName: "Site Institucional",
  amountCents: 50000,
  number: 2,
  total: 3,
  today: "2026-11-15",
};

describe("buildChargeMessage", () => {
  it("parcela atrasada: diz qual parcela está em atraso e informa o PIX", () => {
    expect(buildChargeMessage({ ...base, dueDate: "2026-11-10", status: "atrasado" })).toBe(
      [
        "Olá, João! Tudo bem?",
        "Estou passando para avisar que a parcela 2 de 3 do seu projeto Site Institucional está em atraso.",
        "Valor: R$ 500,00\nVencimento: 10/11/2026 (há 5 dias)",
        "Para regularizar, o pagamento pode ser feito via PIX:\nChave PIX (celular): 47989191953",
        "Assim que pagar, me envie o comprovante por aqui, por favor. Qualquer dúvida, estou à disposição!",
      ].join("\n\n"),
    );
  });

  it("atraso de 1 dia e parcela única", () => {
    const msg = buildChargeMessage({ ...base, number: 1, total: 1, dueDate: "2026-11-14", status: "atrasado" });
    expect(msg).toContain("a parcela única do seu projeto Site Institucional está em atraso");
    expect(msg).toContain("(há 1 dia)");
  });

  it("parcela em dia não inclui o PIX", () => {
    expect(buildChargeMessage({ ...base, dueDate: "2026-11-30", status: "em_dia" })).not.toContain("PIX");
  });

  it("em dia, vencendo hoje e amanhã", () => {
    expect(buildChargeMessage({ ...base, dueDate: "2026-11-30", status: "em_dia" })).toContain(
      "O vencimento será em 30/11/2026.",
    );
    expect(buildChargeMessage({ ...base, dueDate: "2026-11-15", status: "proximo" })).toContain("O vencimento é hoje, 15/11/2026.");
    expect(buildChargeMessage({ ...base, dueDate: "2026-11-16", status: "proximo" })).toContain(
      "O vencimento é amanhã, 16/11/2026.",
    );
  });

  it("parcela única", () => {
    expect(buildChargeMessage({ ...base, number: 1, total: 1, dueDate: "2026-11-30", status: "em_dia" })).toContain(
      "Este é o pagamento em parcela única.",
    );
  });
});
