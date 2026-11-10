
import type { ISODate } from "@/domain/dates";
import type { PaymentPlan } from "@/domain/schedule";
import type { ArmagClient } from "@/lib/supabase";

import { RepoError, type ClientInput, type Repository, type Snapshot } from "./types";
import { assertValidClientInput } from "./validate";

type Row = Record<string, unknown>;

function toRepoError(error: { code?: string; message: string }): RepoError {
  const msg = error.message ?? "";
  if (error.code === "23505" || msg.includes("already_paid")) return new RepoError("already_paid", "Essa parcela já está paga.");
  if (msg.includes("locked_financials")) {
    return new RepoError("locked_financials", "Já existem pagamentos registrados; os valores não podem mudar.");
  }
  if (msg.includes("not_found")) return new RepoError("not_found", "Registro não encontrado.");
  if (msg.includes("invalid")) return new RepoError("invalid", "Dados inválidos.");
  return new RepoError("unknown", "Não foi possível concluir. Verifique sua conexão e tente novamente.");
}

function rpcArgs(input: ClientInput) {
  return {
    p_full_name: input.fullName.trim(),
    p_whatsapp: input.whatsapp,
    p_project_name: input.projectName.trim(),
    p_total_cents: input.totalCents,
    p_down_payment_cents: input.downPaymentCents,
    p_plan: input.plan,
    p_installments_count: input.installmentsCount,
    p_first_due_date: input.firstDueDate,
    p_schedule: input.schedule.map((s) => ({ number: s.number, amount_cents: s.amountCents, due_date: s.dueDate })),
  };
}

export function createSupabaseRepository(sb: ArmagClient): Repository {
  async function run<T>(p: PromiseLike<{ data: T; error: { code?: string; message: string } | null }>): Promise<T> {
    const { data, error } = await p;
    if (error) throw toRepoError(error);
    return data;
  }

  return {
    mode: "supabase",

    async load(): Promise<Snapshot> {
      // Contas de login são compartilhadas com o ERP: só membros do ARMAG acessam.
      const member = await run(sb.rpc("is_member"));
      if (member !== true) {
        throw new RepoError("forbidden", "Sua conta não tem acesso ao ARMAG Cobranças. Fale com o administrador.");
      }
      const [clients, projects, installments, payments] = await Promise.all([
        run(sb.from("clients").select("id, full_name, whatsapp, created_at")),
        run(
          sb
            .from("projects")
            .select("id, client_id, name, total_cents, down_payment_cents, plan, installments_count, first_due_date, created_at"),
        ),
        run(sb.from("installments").select("id, project_id, number, amount_cents, due_date")),
        run(sb.from("payments").select("id, installment_id, amount_cents, paid_at, created_at")),
      ]);
      return {
        clients: (clients as Row[]).map((r) => ({
          id: r.id as string,
          fullName: r.full_name as string,
          whatsapp: r.whatsapp as string,
          createdAt: r.created_at as string,
        })),
        projects: (projects as Row[]).map((r) => ({
          id: r.id as string,
          clientId: r.client_id as string,
          name: r.name as string,
          totalCents: Number(r.total_cents),
          downPaymentCents: Number(r.down_payment_cents),
          plan: r.plan as PaymentPlan,
          installmentsCount: Number(r.installments_count),
          firstDueDate: (r.first_due_date as ISODate | null) ?? null,
          createdAt: r.created_at as string,
        })),
        installments: (installments as Row[]).map((r) => ({
          id: r.id as string,
          projectId: r.project_id as string,
          number: Number(r.number),
          amountCents: Number(r.amount_cents),
          dueDate: r.due_date as ISODate,
        })),
        payments: (payments as Row[]).map((r) => ({
          id: r.id as string,
          installmentId: r.installment_id as string,
          amountCents: Number(r.amount_cents),
          paidAt: r.paid_at as ISODate,
          createdAt: r.created_at as string,
        })),
      };
    },

    async createClient(input) {
      assertValidClientInput(input);
      return (await run(sb.rpc("create_client_with_project", rpcArgs(input)))) as string;
    },

    async updateClient(clientId, input) {
      assertValidClientInput(input);
      await run(sb.rpc("update_client_with_project", { p_client_id: clientId, ...rpcArgs(input) }));
    },

    async deleteClient(clientId) {
      await run(sb.from("clients").delete().eq("id", clientId));
    },

    async registerPayment(installmentId, paidAt) {
      await run(sb.rpc("register_payment", { p_installment_id: installmentId, p_paid_at: paidAt }));
    },

    async undoPayment(installmentId) {
      await run(sb.from("payments").delete().eq("installment_id", installmentId));
    },
  };
}
