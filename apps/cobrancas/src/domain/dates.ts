/** Datas de calendário no formato ISO "aaaa-mm-dd", sem fuso horário. */
export type ISODate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUTC(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Data de hoje no fuso local do navegador. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidISODate(value: string): boolean {
  if (!ISO_RE.test(value)) return false;
  return fromUTC(toUTC(value)) === value;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromUTC(toUTC(iso) + days * 86_400_000);
}

/**
 * Soma meses mantendo o dia original; se o mês de destino não tiver esse dia
 * (ex.: 31 → fevereiro), usa o último dia do mês.
 */
export function addMonths(iso: ISODate, months: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return fromUTC(target.getTime());
}

/** Quantos dias faltam de `from` até `to` (negativo se `to` já passou). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86_400_000);
}
