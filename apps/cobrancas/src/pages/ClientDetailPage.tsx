import { CircleDollarSign, Inbox, Pencil, Phone, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonClass } from "@/components/ui/Button";
import { ChargeButton } from "@/components/ui/ChargeButton";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { useClientView, useData } from "@/data/DataProvider";
import type { ClientView, InstallmentView } from "@/domain/finance";
import { formatPhone } from "@/domain/phone";
import { planLabel } from "@/domain/schedule";
import { useCharge } from "@/features/charge/ChargeProvider";
import { usePayment } from "@/features/payments/PaymentProvider";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/format";

import { NotFound } from "./NotFound";

type Tab = "pendentes" | "atrasadas" | "historico" | "todas";

export function ClientDetailPage() {
  const { id } = useParams();
  const view = useClientView(id);
  const charge = useCharge();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!view) return <NotFound what="cliente" />;
  const { client, project } = view;

  return (
    <>
      <PageHeader
        title={client.fullName}
        back={{ to: "/clientes", label: "Clientes" }}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusBadge status={view.status} />
            <span className="font-medium text-cafe">{project?.name}</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              <Phone className="size-3.5" /> {formatPhone(client.whatsapp)}
            </span>
          </span>
        }
        actions={
          <>
            <Link to={`/clientes/${client.id}/editar`} className={buttonClass("secondary")}>
              <Pencil /> Editar
            </Link>
            <Button variant="danger" icon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
              Excluir
            </Button>
            {view.next && (
              <ChargeButton size="lg" overdue={view.status === "atrasado"} onClick={() => charge(client.id)} className="max-sm:w-full max-sm:justify-center" />
            )}
          </>
        }
      />

      <Overview view={view} />
      <Installments view={view} />

      <DeleteDialog view={view} open={confirmDelete} onClose={() => setConfirmDelete(false)} />
    </>
  );
}

function Overview({ view }: { view: ClientView }) {
  const total = view.project?.totalCents ?? 0;
  const pct = total ? Math.round((view.receivedCents / total) * 100) : 0;
  const segments = 24;
  const filled = Math.round((pct / 100) * segments);

  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <div className="rounded-panel border-[1.5px] border-noite bg-noite p-4 text-creme shadow-hard dot-grid sm:col-span-2 lg:col-span-1">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-creme/55">Progresso</p>
          <p className="tabular font-display text-2xl font-[800] tracking-[-0.04em] text-laranja">{pct}%</p>
        </div>
        {/* barra segmentada estilo "carregando" dos anos 2000 */}
        <div
          className="mt-3 flex gap-[3px] rounded-[10px] border-[1.5px] border-creme/15 bg-noite-800 p-[3px]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Percentual recebido"
        >
          {Array.from({ length: segments }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 flex-1 rounded-[3px]",
                i < filled ? "bg-gradient-to-b from-laranja-300 to-laranja" : "bg-creme/[0.06]",
              )}
            />
          ))}
        </div>
        <p className="mt-2 font-mono text-[11px] text-creme/50">
          {view.project ? `${planLabel[view.project.plan]} · ${view.installments.length} parcela(s)` : ""}
        </p>
      </div>
      <Stat label="Valor do projeto" value={formatBRL(total)} />
      <Stat label="Recebido" value={formatBRL(view.receivedCents)} accent="text-oliva-700" />
      <Stat
        label="Restante"
        value={formatBRL(view.remainingCents)}
        note={view.overdueCents ? `${formatBRL(view.overdueCents)} em atraso` : undefined}
      />
    </section>
  );
}

function Stat({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: string }) {
  return (
    <div className="rounded-panel border-[1.5px] border-noite bg-creme-50 p-4 shadow-hard">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-cafe-300">{label}</p>
      <p className={cn("tabular mt-2 font-display text-[22px] font-bold tracking-[-0.03em]", accent)}>{value}</p>
      {note && <p className="mt-1 font-mono text-xs font-semibold text-laranja-700">{note}</p>}
    </div>
  );
}

function Installments({ view }: { view: ClientView }) {
  const pending = view.installments.filter((i) => !i.payment);
  const overdue = pending.filter((i) => i.status === "atrasado");
  const paid = view.installments.filter((i) => i.payment);
  const [tab, setTab] = useState<Tab>(pending.length ? "pendentes" : "historico");

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "pendentes", label: "Pendentes", count: pending.length },
    { value: "atrasadas", label: "Atrasadas", count: overdue.length },
    { value: "historico", label: "Histórico", count: paid.length + (view.project?.downPaymentCents ? 1 : 0) },
    { value: "todas", label: "Todas", count: view.installments.length },
  ];

  const list =
    tab === "pendentes"
      ? pending
      : tab === "atrasadas"
        ? overdue
        : tab === "historico"
          ? [...paid].sort((a, b) => b.payment!.paidAt.localeCompare(a.payment!.paidAt))
          : view.installments;

  const showEntry = tab === "historico" && Boolean(view.project?.downPaymentCents);

  return (
    <Panel title="Parcelas" code={`${view.installments.length}x`} bodyClassName="p-0 sm:p-0">
      <div
        role="tablist"
        aria-label="Filtrar parcelas"
        className="flex gap-1 overflow-x-auto border-b-[1.5px] border-noite/10 px-3 pt-3"
      >
        {tabs.map((t) => {
          const active = t.value === tab;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.value)}
              className={cn(
                "relative -mb-[1.5px] inline-flex h-10 shrink-0 items-center gap-2 rounded-t-[12px] border-[1.5px] border-b-0 px-3.5 text-[13px] font-semibold transition-colors",
                active ? "border-noite bg-creme-50 text-noite" : "border-transparent text-cafe-300 hover:text-noite",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "tabular rounded-full px-1.5 font-mono text-[10px]",
                  active ? (t.value === "atrasadas" && t.count ? "bg-laranja text-creme-50" : "bg-noite text-creme") : "bg-noite/5",
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3 sm:p-4">
        {list.length === 0 && !showEntry ? (
          <EmptyState
            icon={<Inbox />}
            title={
              tab === "atrasadas"
                ? "Nenhuma parcela atrasada"
                : tab === "pendentes"
                  ? "Nada pendente"
                  : tab === "historico"
                    ? "Nenhum pagamento ainda"
                    : "Sem parcelas"
            }
            description={
              tab === "historico"
                ? "Os recebimentos registrados aparecem aqui."
                : view.installments.length === 0
                  ? "Projeto quitado na entrada."
                  : "Tudo certo por aqui."
            }
            className="py-8"
          />
        ) : (
          <ol className="flex flex-col gap-2.5">
            {list.map((inst) => (
              <InstallmentRow key={inst.id} view={view} inst={inst} />
            ))}
            {showEntry && (
              <li className="flex items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-noite/20 p-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-[12px] border-[1.5px] border-noite bg-oliva font-pixel text-[9px]">
                  ENT
                </span>
                <div className="min-w-0 flex-1">
                  <p className="tabular font-display text-lg font-bold tracking-[-0.03em]">
                    {formatBRL(view.project!.downPaymentCents)}
                  </p>
                  <p className="font-mono text-xs text-cafe-300">Entrada · recebida no cadastro</p>
                </div>
                <StatusBadge status="pago" short />
              </li>
            )}
          </ol>
        )}
      </div>
    </Panel>
  );
}

function InstallmentRow({ view, inst }: { view: ClientView; inst: InstallmentView }) {
  const charge = useCharge();
  const pay = usePayment();
  const { undoPayment } = useData();
  const toast = useToast();
  const [confirmUndo, setConfirmUndo] = useState(false);
  const paid = Boolean(inst.payment);

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border-[1.5px] p-3 sm:flex-nowrap",
        inst.status === "atrasado" ? "border-noite bg-creme-100" : "border-noite/15 bg-creme-100/60",
      )}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[12px] border-[1.5px] border-noite font-display text-sm font-bold",
          paid ? "bg-oliva" : inst.status === "atrasado" ? "bg-noite text-laranja" : "bg-creme-50",
        )}
      >
        {inst.number}
        <span className="sr-only"> de {inst.total}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="tabular font-display text-lg font-bold tracking-[-0.03em]">{formatBRL(inst.amountCents)}</p>
        <p className="font-mono text-xs text-cafe-300">
          Parcela {inst.number}/{inst.total} · vence {formatDate(inst.dueDate)}
          {inst.payment && <span className="text-oliva-700"> · paga em {formatDate(inst.payment.paidAt)}</span>}
        </p>
      </div>
      <StatusBadge status={inst.status} short />
      <div className="flex w-full gap-2 sm:w-auto">
        {paid ? (
          <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => setConfirmUndo(true)} className="ml-auto">
            Desfazer
          </Button>
        ) : (
          <>
            <Button
              variant="dark"
              size="sm"
              icon={<CircleDollarSign />}
              onClick={() => pay(view.client.id, inst.id)}
              className="flex-1 sm:flex-none"
            >
              Marcar paga
            </Button>
            <ChargeButton
              onClick={() => charge(view.client.id, inst.id)}
              overdue={inst.status === "atrasado"}
              className="h-8 flex-1 justify-center pl-2 pr-3 text-[10.5px] sm:flex-none"
            />
          </>
        )}
      </div>

      <Dialog open={confirmUndo} onClose={() => setConfirmUndo(false)} title="Desfazer pagamento" code="undo">
        <p className="text-sm leading-relaxed">
          A parcela {inst.number}/{inst.total} de {formatBRL(inst.amountCents)} voltará a ficar em aberto. Use apenas se o
          pagamento foi registrado por engano.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirmUndo(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={<RotateCcw />}
            onClick={async () => {
              setConfirmUndo(false);
              await undoPayment(inst.id);
              toast({ title: "Pagamento desfeito", description: `Parcela ${inst.number}/${inst.total} voltou a ficar em aberto.`, tone: "warning" });
            }}
          >
            Desfazer pagamento
          </Button>
        </div>
      </Dialog>
    </li>
  );
}

function DeleteDialog({ view, open, onClose }: { view: ClientView; open: boolean; onClose: () => void }) {
  const { deleteClient } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} title="Excluir cliente" code="del">
      <p className="text-sm leading-relaxed">
        Excluir <b className="font-semibold">{view.client.fullName}</b> apaga também o projeto, as{" "}
        {view.installments.length} parcela(s) e todo o histórico de pagamentos. Essa ação não pode ser desfeita.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          icon={<Trash2 />}
          loading={deleting}
          onClick={async () => {
            setDeleting(true);
            const name = view.client.fullName;
            // Sai da página antes: depois de excluído o cliente deixa de existir.
            navigate("/clientes", { replace: true });
            try {
              await deleteClient(view.client.id);
              toast({ title: "Cliente excluído", description: name, tone: "warning" });
            } catch {
              toast({ title: "Não foi possível excluir", description: name, tone: "warning" });
            }
          }}
        >
          Excluir definitivamente
        </Button>
      </div>
    </Dialog>
  );
}
