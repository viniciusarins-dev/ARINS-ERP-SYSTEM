import { isValidISODate } from "@/domain/dates";
import { MAX_INSTALLMENTS } from "@/domain/schedule";

import { RepoError, type ClientInput, type Project } from "./types";

/** Última barreira antes de gravar — o banco repete estas regras. */
export function assertValidClientInput(input: ClientInput): void {
  const fail = (msg: string) => {
    throw new RepoError("invalid", msg);
  };
  if (!input.fullName.trim()) fail("Nome obrigatório.");
  if (!/^\d{10,11}$/.test(input.whatsapp)) fail("WhatsApp inválido.");
  if (!input.projectName.trim()) fail("Projeto obrigatório.");
  if (!Number.isInteger(input.totalCents) || input.totalCents <= 0) fail("Valor total inválido.");
  if (!Number.isInteger(input.downPaymentCents) || input.downPaymentCents < 0) fail("Entrada inválida.");
  if (input.downPaymentCents > input.totalCents) fail("A entrada não pode ser maior que o total.");
  const remaining = input.totalCents - input.downPaymentCents;
  const sum = input.schedule.reduce((s, i) => s + i.amountCents, 0);
  if (sum !== remaining) fail("A soma das parcelas não confere com o saldo restante.");
  if (input.schedule.length > MAX_INSTALLMENTS) fail("Parcelas demais.");
  input.schedule.forEach((s, idx) => {
    if (s.number !== idx + 1 || s.amountCents <= 0 || !isValidISODate(s.dueDate)) fail("Parcela inválida.");
  });
}

/** Os termos financeiros mudaram em relação ao que está gravado? */
export function financialsChanged(
  project: Project,
  current: { amountCents: number; dueDate: string }[],
  input: ClientInput,
): boolean {
  if (
    project.totalCents !== input.totalCents ||
    project.downPaymentCents !== input.downPaymentCents ||
    project.plan !== input.plan ||
    project.installmentsCount !== input.installmentsCount ||
    (project.firstDueDate ?? null) !== (input.firstDueDate ?? null) ||
    current.length !== input.schedule.length
  ) {
    return true;
  }
  return current.some((c, i) => c.amountCents !== input.schedule[i].amountCents || c.dueDate !== input.schedule[i].dueDate);
}
