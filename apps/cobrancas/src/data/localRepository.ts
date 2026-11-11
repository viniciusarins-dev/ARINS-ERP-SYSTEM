import type { ISODate } from "@/domain/dates";

import { RepoError, type ClientInput, type Repository, type Snapshot } from "./types";
import { assertValidClientInput, financialsChanged } from "./validate";

const STORAGE_KEY = "parcela-os:local:v1";

const empty = (): Snapshot => ({
  clients: [],
  projects: [],
  installments: [],
  payments: [],
  budgets: [],
  leads: [],
  settings: { prospectMessage: null, myName: null },
});

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Snapshot) } : empty();
  } catch {
    return empty();
  }
}

function write(s: Snapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

/**
 * Modo local (desenvolvimento): os dados ficam apenas neste navegador.
 * Começa vazio — nada de dados fictícios. Mesmas regras do Supabase.
 */
export function createLocalRepository(): Repository {
  return {
    mode: "local",

    async load() {
      return read();
    },

    async createClient(input: ClientInput) {
      assertValidClientInput(input);
      const s = read();
      const clientId = uid();
      const projectId = uid();
      const createdAt = now();
      s.clients.push({ id: clientId, fullName: input.fullName.trim(), whatsapp: input.whatsapp, createdAt });
      s.projects.push({
        id: projectId,
        clientId,
        name: input.projectName.trim(),
        totalCents: input.totalCents,
        downPaymentCents: input.downPaymentCents,
        plan: input.plan,
        installmentsCount: input.installmentsCount,
        firstDueDate: input.firstDueDate,
        createdAt,
      });
      for (const item of input.schedule) s.installments.push({ id: uid(), projectId, ...item });
      write(s);
      return clientId;
    },

    async updateClient(clientId, input) {
      assertValidClientInput(input);
      const s = read();
      const client = s.clients.find((c) => c.id === clientId);
      const project = s.projects.find((p) => p.clientId === clientId);
      if (!client || !project) throw new RepoError("not_found", "Cliente não encontrado.");

      const current = s.installments.filter((i) => i.projectId === project.id).sort((a, b) => a.number - b.number);
      if (financialsChanged(project, current, input)) {
        const ids = new Set(current.map((i) => i.id));
        if (s.payments.some((p) => ids.has(p.installmentId))) {
          throw new RepoError("locked_financials", "Já existem pagamentos registrados; os valores não podem mudar.");
        }
        s.installments = s.installments.filter((i) => i.projectId !== project.id);
        for (const item of input.schedule) s.installments.push({ id: uid(), projectId: project.id, ...item });
        Object.assign(project, {
          totalCents: input.totalCents,
          downPaymentCents: input.downPaymentCents,
          plan: input.plan,
          installmentsCount: input.installmentsCount,
          firstDueDate: input.firstDueDate,
        });
      }
      client.fullName = input.fullName.trim();
      client.whatsapp = input.whatsapp;
      project.name = input.projectName.trim();
      write(s);
    },

    async deleteClient(clientId) {
      const s = read();
      const projectIds = new Set(s.projects.filter((p) => p.clientId === clientId).map((p) => p.id));
      const instIds = new Set(s.installments.filter((i) => projectIds.has(i.projectId)).map((i) => i.id));
      write({
        ...s,
        clients: s.clients.filter((c) => c.id !== clientId),
        projects: s.projects.filter((p) => !projectIds.has(p.id)),
        installments: s.installments.filter((i) => !instIds.has(i.id)),
        payments: s.payments.filter((p) => !instIds.has(p.installmentId)),
      });
    },

    async registerPayment(installmentId, paidAt: ISODate) {
      const s = read();
      const inst = s.installments.find((i) => i.id === installmentId);
      if (!inst) throw new RepoError("not_found", "Parcela não encontrada.");
      if (s.payments.some((p) => p.installmentId === installmentId)) {
        throw new RepoError("already_paid", "Essa parcela já está paga.");
      }
      s.payments.push({ id: uid(), installmentId, amountCents: inst.amountCents, paidAt, createdAt: now() });
      write(s);
    },

    async undoPayment(installmentId) {
      const s = read();
      s.payments = s.payments.filter((p) => p.installmentId !== installmentId);
      write(s);
    },

    async saveBudget(input, id) {
      const s = read();
      const ts = now();
      if (id) {
        const b = s.budgets.find((x) => x.id === id);
        if (!b) throw new RepoError("not_found", "Orçamento não encontrado.");
        Object.assign(b, input, { updatedAt: ts });
        write(s);
        return id;
      }
      const newId = uid();
      s.budgets.push({ ...input, id: newId, createdAt: ts, updatedAt: ts });
      write(s);
      return newId;
    },

    async deleteBudget(id) {
      const s = read();
      s.budgets = s.budgets.filter((b) => b.id !== id);
      write(s);
    },

    async saveLead(input, id) {
      const s = read();
      if (id) {
        const l = s.leads.find((x) => x.id === id);
        if (!l) throw new RepoError("not_found", "Lead não encontrado.");
        Object.assign(l, input);
        write(s);
        return id;
      }
      if (input.sourceRef && s.leads.some((l) => l.sourceRef === input.sourceRef)) {
        throw new RepoError("duplicate", "Essa empresa já está nos seus leads.");
      }
      const newId = uid();
      s.leads.unshift({ ...input, id: newId, createdAt: now() });
      write(s);
      return newId;
    },

    async updateLead(id, patch) {
      const s = read();
      const l = s.leads.find((x) => x.id === id);
      if (!l) throw new RepoError("not_found", "Lead não encontrado.");
      Object.assign(l, patch);
      write(s);
    },

    async deleteLead(id) {
      const s = read();
      s.leads = s.leads.filter((l) => l.id !== id);
      write(s);
    },

    async saveSettings(patch) {
      const s = read();
      s.settings = { ...s.settings, ...patch };
      write(s);
    },
  };
}
