import { billing } from "@/config/billing";
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
  /** chave PIX informada nas cobranças em atraso (padrão: config/billing) */
  pixKey?: string;
};

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

function overdueSince(days: number): string {
  const late = -days;
  return late === 1 ? "há 1 dia" : `há ${late} dias`;
}

/** Mensagem de cobrança pronta para revisar e enviar manualmente. */
export function buildChargeMessage(i: ChargeMessageInput): string {
  const amount = formatBRL(i.amountCents).replace(/\u00a0/g, " ");
  const due = formatDate(i.dueDate);
  const days = diffDays(i.today, i.dueDate);
  const project = i.projectName.trim();
  const name = firstName(i.clientName);
  const parcela = i.total > 1 ? `a parcela ${i.number} de ${i.total}` : "a parcela única";

  // Parcela em atraso: mensagem própria, dizendo qual parcela venceu e com a chave PIX.
  if (i.status === "atrasado") {
    const pix = i.pixKey ?? billing.pixKey;
    return [
      `Olá, ${name}! Tudo bem?`,
      `Estou passando para avisar que ${parcela} do seu projeto ${project} está em atraso.`,
      `Valor: ${amount}\nVencimento: ${due} (${overdueSince(days)})`,
      `Para regularizar, o pagamento pode ser feito via PIX:\nChave PIX (${billing.pixKeyLabel}): ${pix}`,
      "Assim que pagar, me envie o comprovante por aqui, por favor. Qualquer dúvida, estou à disposição!",
    ].join("\n\n");
  }

  const which = i.total > 1 ? `Esta é a parcela ${i.number} de ${i.total}.` : "Este é o pagamento em parcela única.";

  let dueLine: string;
  if (days === 0) dueLine = `O vencimento é hoje, ${due}.`;
  else if (days === 1) dueLine = `O vencimento é amanhã, ${due}.`;
  else dueLine = `O vencimento será em ${due}.`;

  return [
    `Olá, ${name}! Tudo bem?`,
    `Estou passando para lembrar sobre o pagamento do seu projeto ${project}.`,
    `O valor da parcela atual é de ${amount}.`,
    which,
    dueLine,
    "Qualquer dúvida, estou à disposição!",
  ].join("\n\n");
}
