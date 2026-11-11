import { describe, expect, it } from "vitest";

import { calculateBudget, defaultSelections, describeDuration } from "./budget";

describe("orçamento", () => {
  it("base padrão: publicação + responsivo + 1 página = 13h, R$ 1.300 a R$ 100/h", () => {
    const r = calculateBudget(defaultSelections(), []);
    expect(r.totalHours).toBe(13);
    expect(r.totalCents).toBe(130000);
    expect(r.workDays).toBe(3); // 13h / 6h por dia
  });

  it("soma toggles, seleção, quantidade e tópicos livres", () => {
    const r = calculateBudget(
      { setup: true, login: "2", crud: 3, pages: 0, reset: true },
      [
        { id: "t1", label: "Agenda de horários", hours: 10 },
        { id: "t2", label: "  ", hours: 5 }, // tópico vazio é ignorado
      ],
    );
    // 4 + 14 + 3×4 + 3 + 10 = 43
    expect(r.totalHours).toBe(43);
    expect(r.totalCents).toBe(430000);
    expect(r.lines.find((l) => l.id === "login")?.detail).toBe("2 tipos");
    expect(r.lines.find((l) => l.id === "crud")?.detail).toBe("3 cadastros × 4h");
  });

  it("login 'Não' não soma horas", () => {
    expect(calculateBudget({ login: "nao" }, []).totalHours).toBe(0);
  });

  it("margem para imprevistos e valor/hora personalizados", () => {
    const r = calculateBudget({ admin: true }, [], { hourlyRateCents: 12000, hoursPerDay: 8, marginPercent: 20 });
    expect(r.baseHours).toBe(16);
    expect(r.totalHours).toBe(19.5); // 16 × 1,2 = 19,2 → arredonda para meia hora
    expect(r.totalCents).toBe(234000);
    expect(r.workDays).toBe(3);
  });

  it("descreve o prazo", () => {
    expect(describeDuration(0)).toBe("—");
    expect(describeDuration(1)).toBe("1 dia útil");
    expect(describeDuration(3)).toBe("3 dias úteis");
    expect(describeDuration(12)).toBe("12 dias úteis (~2,5 semanas)");
  });
});

import { budgetClientMessage } from "./budget";
import { formatBRL } from "@/lib/format";

describe("mensagem do orçamento", () => {
  it("lista itens sem horas internas, com prazo e valor", () => {
    const result = calculateBudget({ setup: true, login: "2", crud: 3 }, [{ id: "t", label: "Agenda online", hours: 10 }]);
    const msg = budgetClientMessage({ title: "Sistema da Clínica", clientName: "Maria Souza", result, formatMoney: formatBRL });
    expect(msg).toContain("Olá, Maria! Tudo bem?");
    expect(msg).toContain("• Sistema de login (2 tipos)");
    expect(msg).toContain("• Cadastros (listar, criar, editar, excluir) (3 cadastros)");
    expect(msg).toContain("• Agenda online");
    expect(msg).toContain("Prazo estimado: 7 dias úteis (~1,5 semanas)");
    expect(msg).toContain("Investimento: R$ 4.000,00");
    expect(msg).not.toMatch(/\dh/);
  });
});
