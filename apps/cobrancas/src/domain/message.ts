import { formatBRL, formatDate } from "@/lib/format";
import type { FinancialStatus } from "@/types/status";

import { diffDays, type ISODate } from "./dates";

export type ChargeMessageInput = {
  clientName: string;
  projectName: string;
  amountCents: number;
  number: number;
  total: number;
  dueDate: ISODate;
  status: FinancialStatus;
  today: ISODate;
};

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** Mensagem de cobrança pronta para revisar e enviar manualmente. */
export function buildChargeMessage(i: ChargeMessageInput): string {
  const amount = formatBRL(i.amountCents).replace(/\u00a0/g, " ");
  const due = formatDate(i.dueDate);
  const days = diffDays(i.today, i.dueDate);

  const which = i.total > 1 ? `Esta é a parcela ${i.number} de ${i.total}.` : "Este é o pagamento em parcela única.";

  let dueLine: string;
  if (i.status === "atrasado") dueLine = `O vencimento foi em ${due} e o pagamento está em atraso.`;
  else if (days === 0) dueLine = `O vencimento é hoje, ${due}.`;
  else if (days === 1) dueLine = `O vencimento é amanhã, ${due}.`;
  else dueLine = `O vencimento será em ${due}.`;

  return [
    `Olá, ${firstName(i.clientName)}! Tudo bem?`,
    `Estou passando para lembrar sobre o pagamento do seu projeto ${i.projectName.trim()}.`,
    `O valor da parcela atual é de ${amount}.`,
    which,
    dueLine,
    "Qualquer dúvida, estou à disposição!",
  ].join("\n\n");
}
