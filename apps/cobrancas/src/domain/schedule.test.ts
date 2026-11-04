import { describe, expect, it } from "vitest";

import { addMonths } from "./dates";
import { generateSchedule, splitCents } from "./schedule";

describe("splitCents", () => {
  it("divide exato quando não há sobra", () => {
    expect(splitCents(150000, 3)).toEqual([50000, 50000, 50000]);
  });

  it("distribui centavos de sobra nas primeiras parcelas e fecha a soma", () => {
    const parts = splitCents(100000, 3); // R$ 1.000,00 / 3
    expect(parts).toEqual([33334, 33333, 33333]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100000);
  });

  it("soma sempre igual ao total em vários cenários", () => {
    for (const total of [1, 99, 1001, 123457, 999999]) {
      for (const n of [1, 2, 3, 7, 12, 120]) {
        if (total < n) continue;
        const parts = splitCents(total, n);
        expect(parts).toHaveLength(n);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("rejeita entradas inválidas", () => {
    expect(() => splitCents(100, 0)).toThrow();
    expect(() => splitCents(-1, 2)).toThrow();
    expect(() => splitCents(10.5, 2)).toThrow();
  });
});

describe("generateSchedule", () => {
  it("exemplo do enunciado: 2.000 com 500 de entrada em 3x mensais", () => {
    const s = generateSchedule({ remainingCents: 150000, plan: "mensal", count: 3, firstDueDate: "2026-10-10" });
    expect(s).toEqual([
      { number: 1, amountCents: 50000, dueDate: "2026-10-10" },
      { number: 2, amountCents: 50000, dueDate: "2026-11-10" },
      { number: 3, amountCents: 50000, dueDate: "2026-12-10" },
    ]);
  });

  it("semanal soma 7 dias", () => {
    const s = generateSchedule({ remainingCents: 30000, plan: "semanal", count: 3, firstDueDate: "2026-12-24" });
    expect(s.map((i) => i.dueDate)).toEqual(["2026-12-24", "2026-12-31", "2027-01-07"]);
  });

  it("à vista gera uma única parcela, ignorando a quantidade", () => {
    const s = generateSchedule({ remainingCents: 30000, plan: "avista", count: 5, firstDueDate: "2026-11-20" });
    expect(s).toEqual([{ number: 1, amountCents: 30000, dueDate: "2026-11-20" }]);
  });

  it("restante zero não gera parcelas", () => {
    expect(generateSchedule({ remainingCents: 0, plan: "mensal", count: 3, firstDueDate: "2026-11-20" })).toEqual([]);
  });

  it("mensal a partir do dia 31 usa o último dia de meses curtos", () => {
    const s = generateSchedule({ remainingCents: 40000, plan: "mensal", count: 4, firstDueDate: "2027-01-31" });
    expect(s.map((i) => i.dueDate)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29"); // bissexto
  });
});
