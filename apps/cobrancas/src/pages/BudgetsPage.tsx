import { Calculator, Clock3, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonClass } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/Toaster";
import { useData } from "@/data/DataProvider";
import type { Budget } from "@/data/types";
import { describeDuration } from "@/domain/budget";
import { formatBRL } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function BudgetsPage() {
  const { budgets, deleteBudget } = useData();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<Budget | null>(null);

  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Monte orçamentos marcando o que o projeto precisa. Valor e prazo saem na hora."
        actions={
          <Link to="/orcamentos/novo" className={buttonClass("primary", "lg")}>
            <Plus /> Novo orçamento
          </Link>
        }
      />

      {budgets.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Calculator />}
            title="Nenhum orçamento ainda"
            description="Crie o primeiro: marque login, painel, integrações e tópicos do projeto para ver valor e prazo."
            action={
              <Link to="/orcamentos/novo" className={buttonClass("primary")}>
                <Plus /> Criar orçamento
              </Link>
            }
          />
        </Panel>
      ) : (
        <Panel title={`${budgets.length} ${budgets.length === 1 ? "orçamento" : "orçamentos"}`} icon={<FileText />} bodyClassName="p-0 sm:p-0">
          <ul>
            {budgets.map((b) => {
              const days = Math.ceil(b.totalHours / (b.hoursPerDay || 6));
              return (
                <li
                  key={b.id}
                  className="relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-white/[0.05] px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.025] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <Link to={`/orcamentos/${b.id}`} className="block truncate font-semibold after:absolute after:inset-0 hover:text-gold-200">
                      {b.title}
                    </Link>
                    <p className="truncate text-[13px] text-mist-600">
                      {b.clientName ?? "Sem cliente"} · {dateFmt.format(new Date(b.createdAt))}
                    </p>
                  </div>
                  <p className="tabular row-start-1 text-right text-base font-bold text-gold-200 md:row-auto md:text-left">
                    {formatBRL(b.totalCents)}
                  </p>
                  <p className="col-span-1 flex items-center gap-1.5 text-[13px] text-mist md:col-auto">
                    <Clock3 className="size-3.5" />
                    {String(b.totalHours).replace(".", ",")}h · {describeDuration(days).split(" (")[0]}
                  </p>
                  <div className="relative z-10 flex justify-end">
                    <Button variant="ghost" size="sm" icon={<Trash2 />} aria-label={`Excluir ${b.title}`} onClick={() => setToDelete(b)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Excluir orçamento">
        <p className="text-sm leading-relaxed">
          Excluir o orçamento <b className="font-semibold">{toDelete?.title}</b>? Essa ação não pode ser desfeita.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setToDelete(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 />}
            onClick={async () => {
              const b = toDelete;
              setToDelete(null);
              if (!b) return;
              try {
                await deleteBudget(b.id);
                toast({ title: "Orçamento excluído", description: b.title, tone: "warning" });
              } catch {
                toast({ title: "Não foi possível excluir", tone: "warning" });
              }
            }}
          >
            Excluir
          </Button>
        </div>
      </Dialog>
    </>
  );
}
