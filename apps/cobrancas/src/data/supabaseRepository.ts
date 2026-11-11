
import type { ISODate } from "@/domain/dates";
import type { PaymentPlan } from "@/domain/schedule";
import type { ArmagClient } from "@/lib/supabase";

import { RepoError, type BudgetInput, type ClientInput, type Lead, type LeadInput, type Repository, type Settings, type Snapshot } from "./types";
import { assertValidClientInput } from "./validate";

type Row = Record<string, unknown>;

function toRepoError(error: { code?: string; message: string }): RepoError {
  const msg = error.message ?? "";
  if (msg.includes("leads_source_ref_key")) return new RepoError("duplicate", "Essa empresa já está nos seus leads.");
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

function leadFromRow(r: Row): Lead {
  return {
    id: r.id as string,
    name: r.name as string,
    segment: r.segment as Lead["segment"],
    phone: (r.phone as string | null) ?? null,
    instagram: (r.instagram as string | null) ?? null,
    website: (r.website as string | null) ?? null,
    address: (r.address as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    lat: r.lat === null || r.lat === undefined ? null : Number(r.lat),
    lon: r.lon === null || r.lon === undefined ? null : Number(r.lon),
    source: r.source as Lead["source"],
    sourceRef: (r.source_ref as string | null) ?? null,
    status: r.status as Lead["status"],
    notes: (r.notes as string | null) ?? null,
    lastContactAt: (r.last_contact_at as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

function leadToRow(l: Partial<LeadInput>): Record<string, unknown> {
  const map: Record<string, string> = {
    name: "name", segment: "segment", phone: "phone", instagram: "instagram", website: "website", address: "address",
    city: "city", lat: "lat", lon: "lon", source: "source", sourceRef: "source_ref", status: "status", notes: "notes",
    lastContactAt: "last_contact_at",
  };
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(l)) if (k in map) row[map[k]] = v;
  return row;
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
      const [clients, projects, installments, payments, budgets, leads, settings] = await Promise.all([
        run(sb.from("clients").select("id, full_name, whatsapp, created_at")),
        run(
          sb
            .from("projects")
            .select("id, client_id, name, total_cents, down_payment_cents, plan, installments_count, first_due_date, created_at"),
        ),
        run(sb.from("installments").select("id, project_id, number, amount_cents, due_date")),
        run(sb.from("payments").select("id, installment_id, amount_cents, paid_at, created_at")),
        run(
          sb
            .from("budgets")
            .select(
              "id, title, client_name, client_phone, selections, topics, hourly_rate_cents, hours_per_day, margin_percent, total_hours, total_cents, notes, created_at, updated_at",
            )
            .order("created_at", { ascending: false }),
        ),
        run(sb.from("leads").select("*").order("created_at", { ascending: false })),
        run(sb.from("settings").select("key, value")),
      ]);
      const settingsMap = new Map((settings as Row[]).map((r) => [r.key as string, r.value as { text?: string }]));
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
        budgets: (budgets as Row[]).map((r) => ({
          id: r.id as string,
          title: r.title as string,
          clientName: (r.client_name as string | null) ?? null,
          clientPhone: (r.client_phone as string | null) ?? null,
          selections: (r.selections as Snapshot["budgets"][number]["selections"]) ?? {},
          topics: (r.topics as Snapshot["budgets"][number]["topics"]) ?? [],
          hourlyRateCents: Number(r.hourly_rate_cents),
          hoursPerDay: Number(r.hours_per_day),
          marginPercent: Number(r.margin_percent),
          totalHours: Number(r.total_hours),
          totalCents: Number(r.total_cents),
          notes: (r.notes as string | null) ?? null,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        })),
        leads: (leads as Row[]).map(leadFromRow),
        settings: {
          prospectMessage: settingsMap.get("prospect_message")?.text ?? null,
          myName: settingsMap.get("my_name")?.text ?? null,
        },
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

    async saveBudget(input: BudgetInput, id?: string) {
      const row = {
        title: input.title.trim(),
        client_name: input.clientName?.trim() || null,
        client_phone: input.clientPhone || null,
        selections: input.selections,
        topics: input.topics,
        hourly_rate_cents: input.hourlyRateCents,
        hours_per_day: input.hoursPerDay,
        margin_percent: input.marginPercent,
        total_hours: input.totalHours,
        total_cents: input.totalCents,
        notes: input.notes?.trim() || null,
      };
      if (id) {
        await run(sb.from("budgets").update(row).eq("id", id));
        return id;
      }
      const data = (await run(sb.from("budgets").insert(row).select("id").single())) as { id: string };
      return data.id;
    },

    async deleteBudget(id) {
      await run(sb.from("budgets").delete().eq("id", id));
    },

    async saveLead(input: LeadInput, id?: string) {
      const row = leadToRow(input);
      if (id) {
        await run(sb.from("leads").update(row).eq("id", id));
        return id;
      }
      const data = (await run(sb.from("leads").insert(row).select("id").single())) as { id: string };
      return data.id;
    },

    async updateLead(id, patch) {
      await run(sb.from("leads").update(leadToRow(patch)).eq("id", id));
    },

    async deleteLead(id) {
      await run(sb.from("leads").delete().eq("id", id));
    },

    async saveSettings(patch: Partial<Settings>) {
      const rows = [
        ...(patch.prospectMessage !== undefined ? [{ key: "prospect_message", value: { text: patch.prospectMessage } }] : []),
        ...(patch.myName !== undefined ? [{ key: "my_name", value: { text: patch.myName } }] : []),
      ];
      if (rows.length) await run(sb.from("settings").upsert(rows));
    },
  };
}
