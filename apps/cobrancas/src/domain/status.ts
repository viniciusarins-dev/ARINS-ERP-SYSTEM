import type { FinancialStatus } from "@/types/status";

import { diffDays, type ISODate } from "./dates";

/** Janela (em dias, incluindo hoje) para "próximo do vencimento". */
export const DUE_SOON_DAYS = 3;

/** Situação de uma parcela, calculada a partir da data de hoje — nunca gravada. */
export function installmentStatus(dueDate: ISODate, paid: boolean, today: ISODate): FinancialStatus {
  if (paid) return "pago";
  const days = diffDays(today, dueDate);
  if (days < 0) return "atrasado";
  if (days <= DUE_SOON_DAYS) return "proximo";
  return "em_dia";
}

const priority: FinancialStatus[] = ["atrasado", "proximo", "em_dia"];

/** Situação geral: a pior situação entre as parcelas em aberto. */
export function aggregateStatus(statuses: FinancialStatus[]): FinancialStatus {
  for (const s of priority) if (statuses.includes(s)) return s;
  return "pago";
}
