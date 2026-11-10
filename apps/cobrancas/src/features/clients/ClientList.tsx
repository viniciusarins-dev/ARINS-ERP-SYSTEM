import { Plus, Search, SearchX, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import type { ClientView } from "@/domain/finance";
import { useCharge } from "@/features/charge/ChargeProvider";
import { cn } from "@/lib/cn";
import type { FinancialStatus } from "@/types/status";

import { ClientRow } from "./ClientRow";

type Filter = "todos" | FinancialStatus;

const filters: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "atrasado", label: "Atrasado" },
  { value: "proximo", label: "Próximo" },
  { value: "em_dia", label: "Em dia" },
  { value: "pago", label: "Pago" },
];

/** Remove acentos para a busca: "joao" encontra "João". */
function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ClientList({ views, title = "Clientes" }: { views: ClientView[]; title?: string }) {
  const [query, setQuery] = useState("");
  const [params] = useSearchParams();
  const fromUrl = params.get("situacao");
  const [filter, setFilter] = useState<Filter>(
    filters.some((f) => f.value === fromUrl) ? (fromUrl as Filter) : "todos",
  );
  const charge = useCharge();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: views.length, atrasado: 0, proximo: 0, em_dia: 0, pago: 0 };
    for (const v of views) c[v.status]++;
    return c;
  }, [views]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return views.filter(
      (v) => (filter === "todos" || v.status === filter) && (!q || normalize(v.client.fullName).includes(q)),
    );
  }, [views, query, filter]);

  if (views.length === 0) {
    return (
      <Panel title={title}>
        <EmptyState
          icon={<Users />}
          title="Nenhum cliente por aqui"
          description="Cadastre o primeiro cliente e as parcelas são geradas automaticamente."
          action={
            <Link to="/clientes/novo" className={buttonClass("primary")}>
              <Plus /> Cadastrar cliente
            </Link>
          }
        />
      </Panel>
    );
  }

  return (
    <Panel title={title} bodyClassName="p-0 sm:p-0">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mist-600" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente pelo nome"
            className="pl-10 pr-10"
            aria-label="Buscar cliente pelo nome"
            type="search"
          />
          {query && (
            <button
              aria-label="Limpar busca"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-mist-600 hover:bg-white/[0.06] hover:text-ice"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0" role="group" aria-label="Filtrar por situação">
          {filters.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                aria-pressed={active}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "border-gold/50 bg-gold/[0.14] text-gold-200"
                    : "border-white/10 text-mist hover:border-white/25 hover:text-ice",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "tabular rounded-full px-1.5 text-[10px]",
                    active ? "bg-gold/20 text-gold-200" : "bg-white/[0.06] text-mist-600",
                  )}
                >
                  {counts[f.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Nada encontrado"
          description="Nenhum cliente corresponde à busca ou ao filtro selecionado."
          action={
            <button
              className={buttonClass("secondary", "sm")}
              onClick={() => {
                setQuery("");
                setFilter("todos");
              }}
            >
              Limpar filtros
            </button>
          }
        />
      ) : (
        <ul>
          {visible.map((v) => (
            <ClientRow
              key={v.client.id}
              id={v.client.id}
              name={v.client.fullName}
              project={v.project?.name ?? "—"}
              remainingCents={v.remainingCents}
              nextDue={v.next?.dueDate ?? null}
              status={v.status}
              href={`/clientes/${v.client.id}`}
              onCharge={v.next ? () => charge(v.client.id) : undefined}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
