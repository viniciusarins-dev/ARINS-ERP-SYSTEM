import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { ISODate } from "@/domain/dates";
import { buildClientViews, computeKpis, type ClientView, type Kpis } from "@/domain/finance";
import { useToday } from "@/hooks/useToday";
import { supabase } from "@/lib/supabase";

import { createLocalRepository } from "./localRepository";
import { createSupabaseRepository } from "./supabaseRepository";
import {
  RepoError,
  type Budget,
  type BudgetInput,
  type ClientInput,
  type Lead,
  type LeadInput,
  type Repository,
  type Settings,
  type Snapshot,
} from "./types";

type DataState = {
  mode: Repository["mode"];
  today: ISODate;
  loading: boolean;
  error: string | null;
  views: ClientView[];
  kpis: Kpis;
  budgets: Budget[];
  saveBudget: (input: BudgetInput, id?: string) => Promise<string>;
  deleteBudget: (id: string) => Promise<void>;
  leads: Lead[];
  settings: Settings;
  saveLead: (input: LeadInput, id?: string) => Promise<string>;
  updateLead: (id: string, patch: Partial<LeadInput>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  reload: () => Promise<void>;
  createClient: (input: ClientInput) => Promise<string>;
  updateClient: (clientId: string, input: ClientInput) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  registerPayment: (installmentId: string, paidAt: ISODate) => Promise<void>;
  undoPayment: (installmentId: string) => Promise<void>;
};

const DataContext = createContext<DataState | null>(null);

const emptySnapshot: Snapshot = {
  clients: [],
  projects: [],
  installments: [],
  payments: [],
  budgets: [],
  leads: [],
  settings: { prospectMessage: null, myName: null },
};

export function DataProvider({ children }: { children: ReactNode }) {
  const repo = useMemo<Repository>(
    () => (supabase ? createSupabaseRepository(supabase) : createLocalRepository()),
    [],
  );
  const today = useToday();
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** parcelas com pagamento em andamento — bloqueia clique duplo */
  const inFlight = useRef(new Set<string>());

  const reload = useCallback(async () => {
    try {
      setSnapshot(await repo.load());
      setError(null);
    } catch (e) {
      setError(e instanceof RepoError ? e.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    // Carga inicial vinda de um sistema externo (banco); o setState acontece após o await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const views = useMemo(() => buildClientViews(snapshot, today), [snapshot, today]);
  const kpis = useMemo(() => computeKpis(views), [views]);

  const value = useMemo<DataState>(
    () => ({
      mode: repo.mode,
      today,
      loading,
      error,
      views,
      kpis,
      budgets: snapshot.budgets,
      async saveBudget(input, id) {
        const savedId = await repo.saveBudget(input, id);
        await reload();
        return savedId;
      },
      async deleteBudget(id) {
        await repo.deleteBudget(id);
        await reload();
      },
      leads: snapshot.leads,
      settings: snapshot.settings,
      async saveLead(input, id) {
        const savedId = await repo.saveLead(input, id);
        await reload();
        return savedId;
      },
      async updateLead(id, patch) {
        await repo.updateLead(id, patch);
        await reload();
      },
      async deleteLead(id) {
        await repo.deleteLead(id);
        await reload();
      },
      async saveSettings(patch) {
        await repo.saveSettings(patch);
        await reload();
      },
      reload,
      async createClient(input) {
        const id = await repo.createClient(input);
        await reload();
        return id;
      },
      async updateClient(clientId, input) {
        await repo.updateClient(clientId, input);
        await reload();
      },
      async deleteClient(clientId) {
        await repo.deleteClient(clientId);
        await reload();
      },
      async registerPayment(installmentId, paidAt) {
        if (inFlight.current.has(installmentId)) {
          throw new RepoError("already_paid", "Esse pagamento já está sendo registrado.");
        }
        inFlight.current.add(installmentId);
        try {
          await repo.registerPayment(installmentId, paidAt);
        } finally {
          inFlight.current.delete(installmentId);
          await reload();
        }
      },
      async undoPayment(installmentId) {
        await repo.undoPayment(installmentId);
        await reload();
      },
    }),
    [repo, today, loading, error, views, kpis, snapshot.budgets, snapshot.leads, snapshot.settings, reload],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData fora do DataProvider");
  return ctx;
}

export function useClientView(clientId: string | undefined): ClientView | undefined {
  const { views } = useData();
  return views.find((v) => v.client.id === clientId);
}
