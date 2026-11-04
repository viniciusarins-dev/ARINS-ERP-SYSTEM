export type FinancialStatus = "pago" | "em_dia" | "proximo" | "atrasado";

export const statusLabel: Record<FinancialStatus, string> = {
  pago: "Pago",
  em_dia: "Em dia",
  proximo: "Próximo do vencimento",
  atrasado: "Atrasado",
};

export const statusShortLabel: Record<FinancialStatus, string> = {
  pago: "Pago",
  em_dia: "Em dia",
  proximo: "Vence logo",
  atrasado: "Atrasado",
};
