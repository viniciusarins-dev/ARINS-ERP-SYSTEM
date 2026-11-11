import type { ISODate } from "@/domain/dates";
import type { BudgetSelections, CustomTopic } from "@/domain/budget";
import type { PaymentPlan } from "@/domain/schedule";

/** Todos os valores monetários são inteiros em centavos. */

export type Client = {
  id: string;
  fullName: string;
  /** DDD + número, só dígitos (10 ou 11). */
  whatsapp: string;
  createdAt: string;
};

export type Project = {
  id: string;
  clientId: string;
  name: string;
  totalCents: number;
  downPaymentCents: number;
  plan: PaymentPlan;
  installmentsCount: number;
  firstDueDate: ISODate | null;
  createdAt: string;
};

export type Installment = {
  id: string;
  projectId: string;
  number: number;
  amountCents: number;
  dueDate: ISODate;
};

export type Payment = {
  id: string;
  installmentId: string;
  amountCents: number;
  paidAt: ISODate;
  createdAt: string;
};

export type Budget = {
  id: string;
  title: string;
  clientName: string | null;
  clientPhone: string | null;
  selections: BudgetSelections;
  topics: CustomTopic[];
  hourlyRateCents: number;
  hoursPerDay: number;
  marginPercent: number;
  totalHours: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetInput = Omit<Budget, "id" | "createdAt" | "updatedAt">;

export type Snapshot = {
  clients: Client[];
  projects: Project[];
  installments: Installment[];
  payments: Payment[];
  budgets: Budget[];
};

export type ScheduleInput = {
  number: number;
  amountCents: number;
  dueDate: ISODate;
};

/** Dados do formulário de cliente, já validados e normalizados. */
export type ClientInput = {
  fullName: string;
  whatsapp: string;
  projectName: string;
  totalCents: number;
  downPaymentCents: number;
  plan: PaymentPlan;
  installmentsCount: number;
  firstDueDate: ISODate | null;
  schedule: ScheduleInput[];
};

export type RepoErrorCode = "already_paid" | "locked_financials" | "not_found" | "invalid" | "forbidden" | "unknown";

export class RepoError extends Error {
  constructor(
    public code: RepoErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RepoError";
  }
}

export interface Repository {
  readonly mode: "local" | "supabase";
  load(): Promise<Snapshot>;
  createClient(input: ClientInput): Promise<string>;
  /** Se já houver pagamentos, os termos financeiros não podem mudar. */
  updateClient(clientId: string, input: ClientInput): Promise<void>;
  deleteClient(clientId: string): Promise<void>;
  /** Falha com `already_paid` se a parcela já tiver pagamento. */
  registerPayment(installmentId: string, paidAt: ISODate): Promise<void>;
  undoPayment(installmentId: string): Promise<void>;
  /** cria (sem id) ou atualiza um orçamento; devolve o id */
  saveBudget(input: BudgetInput, id?: string): Promise<string>;
  deleteBudget(id: string): Promise<void>;
}
