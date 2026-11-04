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
  it("parcela atrasada — igual ao exemplo do enunciado", () => {
    expect(buildChargeMessage({ ...base, dueDate: "2026-11-10", status: "atrasado" })).toBe(
      [
        "Olá, João! Tudo bem?",
        "Estou passando para lembrar sobre o pagamento do seu projeto Site Institucional.",
        "O valor da parcela atual é de R$ 500,00.",
        "Esta é a parcela 2 de 3.",
        "O vencimento foi em 10/11/2026 e o pagamento está em atraso.",
        "Qualquer dúvida, estou à disposição!",
      ].join("\n\n"),
    );
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
