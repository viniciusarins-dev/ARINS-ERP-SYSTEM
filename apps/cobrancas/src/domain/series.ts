import { addDays, type ISODate } from "./dates";
import type { ClientView } from "./finance";

export type DayPoint = { date: ISODate; received: number; due: number };

/**
 * Série diária (em centavos) para os últimos `days` dias até `today`:
 * quanto foi recebido e quanto venceu em cada dia, mais os acumulados.
 */
export function dailySeries(views: ClientView[], today: ISODate, days = 30) {
  const start = addDays(today, -(days - 1));
  const index = new Map<string, DayPoint>();
  const points: DayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const p = { date: addDays(start, i), received: 0, due: 0 };
    points.push(p);
    index.set(p.date, p);
  }
  for (const v of views) {
    for (const inst of v.installments) {
      const d = index.get(inst.dueDate);
      if (d) d.due += inst.amountCents;
      if (inst.payment) {
        const r = index.get(inst.payment.paidAt);
        if (r) r.received += inst.payment.amountCents;
      }
    }
  }
  let accR = 0;
  let accD = 0;
  return points.map((p) => {
    accR += p.received;
    accD += p.due;
    return { ...p, receivedAcc: accR, dueAcc: accD };
  });
}

/** Vencimentos em aberto nos próximos `days` dias, acumulados dia a dia. */
export function upcomingDueSeries(views: ClientView[], today: ISODate, days = 30): number[] {
  const out = new Array<number>(days).fill(0);
  for (const v of views) {
    for (const inst of v.installments) {
      if (inst.payment) continue;
      for (let i = 0; i < days; i++) {
        if (inst.dueDate <= addDays(today, i)) out[i] += inst.amountCents;
      }
    }
  }
  return out;
}
