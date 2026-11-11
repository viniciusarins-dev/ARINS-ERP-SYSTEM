import { describe, expect, it } from "vitest";

import type { Snapshot } from "@/data/types";

import { buildClientViews } from "./finance";
import { dailySeries, upcomingDueSeries } from "./series";

const snap: Snapshot = {
  clients: [{ id: "c1", fullName: "Ana", whatsapp: "11987654321", createdAt: "x" }],
  projects: [{ id: "p1", clientId: "c1", name: "Site", totalCents: 30000, downPaymentCents: 0, plan: "mensal", installmentsCount: 3, firstDueDate: "2026-11-01", createdAt: "x" }],
  installments: [
    { id: "i1", projectId: "p1", number: 1, amountCents: 10000, dueDate: "2026-11-01" },
    { id: "i2", projectId: "p1", number: 2, amountCents: 10000, dueDate: "2026-11-08" },
    { id: "i3", projectId: "p1", number: 3, amountCents: 10000, dueDate: "2026-11-20" },
  ],
  payments: [{ id: "x", installmentId: "i1", amountCents: 10000, paidAt: "2026-11-03", createdAt: "y" }],
  budgets: [],
  leads: [],
  settings: { prospectMessage: null, myName: null },
};

describe("séries do painel", () => {
  const views = buildClientViews(snap, "2026-11-10");

  it("acumula recebido e vencido por dia", () => {
    const s = dailySeries(views, "2026-11-10", 10);
    expect(s).toHaveLength(10);
    expect(s[0].date).toBe("2026-11-01");
    expect(s.at(-1)!.receivedAcc).toBe(10000);
    expect(s.at(-1)!.dueAcc).toBe(20000);
    expect(s[2].received).toBe(10000);
  });

  it("projeta vencimentos em aberto", () => {
    const s = upcomingDueSeries(views, "2026-11-10", 15);
    expect(s[0]).toBe(10000); // parcela 2 já vencida conta desde o início
    expect(s.at(-1)).toBe(20000); // inclui a parcela de 20/11
  });
});
