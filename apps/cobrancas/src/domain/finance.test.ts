import { describe, expect, it } from "vitest";

import type { Snapshot } from "@/data/types";

import { buildClientViews, computeKpis, recentPayments, upcomingCharges } from "./finance";

const snapshot: Snapshot = {
  clients: [
    { id: "c1", fullName: "Ana", whatsapp: "11987654321", createdAt: "2026-10-01T00:00:00Z" },
    { id: "c2", fullName: "Bruno", whatsapp: "11987654321", createdAt: "2026-10-01T00:00:00Z" },
  ],
  projects: [
    { id: "p1", clientId: "c1", name: "Site", totalCents: 200000, downPaymentCents: 50000, plan: "mensal", installmentsCount: 3, firstDueDate: "2026-10-10", createdAt: "x" },
    { id: "p2", clientId: "c2", name: "Loja", totalCents: 100000, downPaymentCents: 100000, plan: "avista", installmentsCount: 0, firstDueDate: null, createdAt: "x" },
  ],
  installments: [
    { id: "i1", projectId: "p1", number: 1, amountCents: 50000, dueDate: "2026-10-10" },
    { id: "i2", projectId: "p1", number: 2, amountCents: 50000, dueDate: "2026-11-01" },
    { id: "i3", projectId: "p1", number: 3, amountCents: 50000, dueDate: "2026-12-10" },
  ],
  payments: [{ id: "pay1", installmentId: "i1", amountCents: 50000, paidAt: "2026-10-09", createdAt: "y" }],
};

describe("finance", () => {
  const views = buildClientViews(snapshot, "2026-11-04");
  const ana = views.find((v) => v.client.id === "c1")!;
  const bruno = views.find((v) => v.client.id === "c2")!;

  it("calcula saldo, atraso e próxima parcela por cliente", () => {
    expect(ana.receivedCents).toBe(100000); // entrada + parcela 1
    expect(ana.remainingCents).toBe(100000);
    expect(ana.overdueCents).toBe(50000);
    expect(ana.status).toBe("atrasado");
    expect(ana.next?.id).toBe("i2");
    expect(ana.installments.map((i) => i.status)).toEqual(["pago", "atrasado", "em_dia"]);
  });

  it("projeto quitado na entrada aparece como pago", () => {
    expect(bruno.status).toBe("pago");
    expect(bruno.remainingCents).toBe(0);
    expect(bruno.next).toBeNull();
  });

  it("indicadores gerais", () => {
    expect(computeKpis(views)).toEqual({
      receivedCents: 200000,
      toReceiveCents: 100000,
      overdueCents: 50000,
      overdueCount: 1,
      activeClients: 1,
      pendingInstallments: 2,
      nextDue: "2026-12-10",
    });
  });

  it("pagar a parcela atrasada atualiza tudo imediatamente", () => {
    const paid = buildClientViews(
      { ...snapshot, payments: [...snapshot.payments, { id: "pay2", installmentId: "i2", amountCents: 50000, paidAt: "2026-11-04", createdAt: "z" }] },
      "2026-11-04",
    );
    const k = computeKpis(paid);
    expect(k.overdueCents).toBe(0);
    expect(k.receivedCents).toBe(250000);
    expect(paid.find((v) => v.client.id === "c1")!.status).toBe("em_dia");
  });

  it("listas de próximas cobranças e recebimentos recentes", () => {
    expect(upcomingCharges(views).map((c) => c.installment.id)).toEqual(["i2", "i3"]);
    expect(recentPayments(views).map((c) => c.installment.id)).toEqual(["i1"]);
  });
});
