const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlNumber = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

/** Valores são armazenados em centavos (inteiros) para evitar erros de ponto flutuante. */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Apenas o número, sem o "R$" — útil quando o símbolo é estilizado à parte. */
export function formatBRLNumber(cents: number): string {
  return brlNumber.format(cents / 100);
}

/** Recebe uma data ISO (yyyy-mm-dd) e devolve dd/mm/aaaa. */
export function formatDate(iso: string): string {
  return date.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}
