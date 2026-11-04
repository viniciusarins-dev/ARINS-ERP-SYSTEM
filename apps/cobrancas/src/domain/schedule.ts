import { addDays, addMonths, type ISODate } from "./dates";

export type PaymentPlan = "avista" | "semanal" | "mensal";

export const planLabel: Record<PaymentPlan, string> = {
  avista: "À vista",
  semanal: "Semanal",
  mensal: "Mensal",
};

export const MAX_INSTALLMENTS = 120;

export type ScheduleItem = {
  number: number;
  amountCents: number;
  dueDate: ISODate;
};

/**
 * Divide um valor em `n` partes inteiras (centavos). Os centavos que sobram
 * vão, um a um, para as primeiras parcelas — a soma fecha sempre exata.
 */
export function splitCents(totalCents: number, n: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error("Valor inválido");
  if (!Number.isInteger(n) || n < 1) throw new Error("Quantidade de parcelas inválida");
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function generateSchedule(params: {
  remainingCents: number;
  plan: PaymentPlan;
  count: number;
  firstDueDate: ISODate;
}): ScheduleItem[] {
  const { remainingCents, plan, firstDueDate } = params;
  if (remainingCents <= 0) return [];
  const count = plan === "avista" ? 1 : params.count;
  return splitCents(remainingCents, count).map((amountCents, i) => ({
    number: i + 1,
    amountCents,
    dueDate: plan === "semanal" ? addDays(firstDueDate, i * 7) : addMonths(firstDueDate, i),
  }));
}
