import { describe, expect, it } from "vitest";

import { calculateBudget, defaultSelections, describeDuration } from "./budget";

describe("orçamento", () => {
  it("base padrão: publicação + responsivo + 1 página = 6,5h, R$ 650 a R$ 100/h", () => {
    const r = calculateBudget(defaultSelections(), []);
    expect(r.totalHours).toBe(6.5);
    expect(r.totalCents).toBe(65000);
    expect(r.workDays).toBe(2); // 6,5h / 6h por dia
  });

  it("soma toggles, seleção, quantidade e tópicos livres", () => {
    const r = calculateBudget(
      { setup: true, login: "2", crud: 3, pages: 0, reset: true },
      [
        { id: "t1", label: "Agenda de horários", hours: 10 },
        { id: "t2", label: "  ", hours: 5 }, // tópico vazio é ignorado
      ],
    );
    // 2 + 7 + 3×2 + 1,5 + 10 = 26,5
    expect(r.totalHours).toBe(26.5);
    expect(r.totalCents).toBe(265000);
    expect(r.lines.find((l) => l.id === "login")?.detail).toBe("2 tipos");
    expect(r.lines.find((l) => l.id === "crud")?.detail).toBe("3 cadastros × 2h");
  });

  it("login 'Não' não soma horas", () => {
    expect(calculateBudget({ login: "nao" }, []).totalHours).toBe(0);
  });

  it("margem para imprevistos e valor/hora personalizados", () => {
    const r = calculateBudget({ admin: true }, [], { hourlyRateCents: 12000, hoursPerDay: 8, marginPercent: 20 });
    expect(r.baseHours).toBe(8);
    expect(r.totalHours).toBe(10); // 8 × 1,2 = 9,6 → arredonda para cima, de meia em meia hora
    expect(r.totalCents).toBe(120000);
    expect(r.workDays).toBe(2);
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
    expect(msg).toContain("Prazo estimado: 5 dias úteis (~1 semana)");
    expect(msg).toContain("Investimento: R$ 2.500,00");
    expect(msg).not.toMatch(/\dh/);
  });
});
