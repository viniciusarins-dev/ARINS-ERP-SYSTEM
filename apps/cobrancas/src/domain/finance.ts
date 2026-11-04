import type { Client, Installment, Payment, Project, Snapshot } from "@/data/types";
import type { FinancialStatus } from "@/types/status";

import type { ISODate } from "./dates";
import { aggregateStatus, installmentStatus } from "./status";

export type InstallmentView = Installment & {
  status: FinancialStatus;
  payment: Payment | null;
  total: number;
};

export type ClientView = {
  client: Client;
  project: Project | null;
  installments: InstallmentView[];
  /** entrada + parcelas pagas */
  receivedCents: number;
  /** soma das parcelas em aberto */
  remainingCents: number;
  overdueCents: number;
  pendingCount: number;
  overdueCount: number;
  /** primeira parcela em aberto (a que deve ser cobrada por padrão) */
  next: InstallmentView | null;
  status: FinancialStatus;
};

export function buildClientViews(snapshot: Snapshot, today: ISODate): ClientView[] {
  const paymentByInstallment = new Map(snapshot.payments.map((p) => [p.installmentId, p]));
  const installmentsByProject = new Map<string, Installment[]>();
  for (const inst of snapshot.installments) {
    const list = installmentsByProject.get(inst.projectId) ?? [];
    list.push(inst);
    installmentsByProject.set(inst.projectId, list);
  }
  const projectByClient = new Map<string, Project>();
  for (const p of snapshot.projects) {
    const current = projectByClient.get(p.clientId);
    if (!current || p.createdAt > current.createdAt) projectByClient.set(p.clientId, p);
  }

  return snapshot.clients
    .map((client) => {
      const project = projectByClient.get(client.id) ?? null;
      const raw = project ? (installmentsByProject.get(project.id) ?? []) : [];
      const sorted = [...raw].sort((a, b) => a.number - b.number);
      const installments: InstallmentView[] = sorted.map((inst) => {
        const payment = paymentByInstallment.get(inst.id) ?? null;
        return {
          ...inst,
          payment,
          total: sorted.length,
          status: installmentStatus(inst.dueDate, payment !== null, today),
        };
      });

      const open = installments.filter((i) => !i.payment);
      const overdue = open.filter((i) => i.status === "atrasado");
      const paidSum = installments.reduce((s, i) => s + (i.payment ? i.payment.amountCents : 0), 0);

      return {
        client,
        project,
        installments,
        receivedCents: (project?.downPaymentCents ?? 0) + paidSum,
        remainingCents: open.reduce((s, i) => s + i.amountCents, 0),
        overdueCents: overdue.reduce((s, i) => s + i.amountCents, 0),
        pendingCount: open.length,
        overdueCount: overdue.length,
        next: open[0] ?? null,
        status: aggregateStatus(open.map((i) => i.status)),
      } satisfies ClientView;
    })
    .sort((a, b) => a.client.fullName.localeCompare(b.client.fullName, "pt-BR"));
}

export type Kpis = {
  receivedCents: number;
  toReceiveCents: number;
  overdueCents: number;
  overdueCount: number;
  activeClients: number;
  pendingInstallments: number;
  nextDue: ISODate | null;
};

export function computeKpis(views: ClientView[]): Kpis {
  let nextDue: ISODate | null = null;
  for (const v of views) {
    for (const i of v.installments) {
      if (!i.payment && i.status !== "atrasado" && (!nextDue || i.dueDate < nextDue)) nextDue = i.dueDate;
    }
  }
  return {
    receivedCents: views.reduce((s, v) => s + v.receivedCents, 0),
    toReceiveCents: views.reduce((s, v) => s + v.remainingCents, 0),
    overdueCents: views.reduce((s, v) => s + v.overdueCents, 0),
    overdueCount: views.reduce((s, v) => s + v.overdueCount, 0),
    activeClients: views.filter((v) => v.pendingCount > 0).length,
    pendingInstallments: views.reduce((s, v) => s + v.pendingCount, 0),
    nextDue,
  };
}

export type ChargeItem = { view: ClientView; installment: InstallmentView };

/** Parcelas em aberto ordenadas por vencimento (atrasadas primeiro). */
export function upcomingCharges(views: ClientView[], limit = 6): ChargeItem[] {
  return views
    .flatMap((view) => view.installments.filter((i) => !i.payment).map((installment) => ({ view, installment })))
    .sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate))
    .slice(0, limit);
}

/** Últimos recebimentos registrados. */
export function recentPayments(views: ClientView[], limit = 6): ChargeItem[] {
  return views
    .flatMap((view) => view.installments.filter((i) => i.payment).map((installment) => ({ view, installment })))
    .sort((a, b) => {
      const pa = a.installment.payment!;
      const pb = b.installment.payment!;
      return pb.paidAt.localeCompare(pa.paidAt) || pb.createdAt.localeCompare(pa.createdAt);
    })
    .slice(0, limit);
}
