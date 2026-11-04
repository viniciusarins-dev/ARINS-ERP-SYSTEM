import { ArrowRight, CircleDollarSign, Hourglass, Inbox, Layers3, Plus, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { ChargeButton } from "@/components/ui/ChargeButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/data/DataProvider";
import { recentPayments, upcomingCharges, type ChargeItem } from "@/domain/finance";
import { useCharge } from "@/features/charge/ChargeProvider";
import { ClientAvatar } from "@/features/clients/ClientRow";
import { ClientList } from "@/features/clients/ClientList";
import { formatBRL, formatDate } from "@/lib/format";

const longDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function Dashboard() {
  const { views, kpis, today } = useData();
  const charge = useCharge();
  const upcoming = upcomingCharges(views, 5);
  const recent = recentPayments(views, 5);

  return (
    <>
      <PageHeader
        title="Painel"
        eyebrow={longDate.format(new Date(`${today}T00:00:00Z`))}
        actions={
          <Link to="/clientes/novo" className={buttonClass("primary", "lg", "max-lg:hidden")}>
            <Plus /> Novo cliente
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          tone="dark"
          label="A receber"
          code="02"
          icon={<Wallet />}
          value={kpis.toReceiveCents}
          money
          caption={plural(kpis.pendingInstallments, "parcela em aberto", "parcelas em aberto")}
          className="col-span-2 lg:col-span-1"
        />
        <KpiCard
          label="Recebido"
          code="01"
          icon={<CircleDollarSign />}
          value={kpis.receivedCents}
          money
          caption="Entradas + parcelas pagas"
          style={{ animationDelay: "60ms" }}
        />
        <KpiCard
          tone={kpis.overdueCents > 0 ? "accent" : "light"}
          label="Em atraso"
          code="03"
          icon={<Hourglass />}
          value={kpis.overdueCents}
          money
          caption={kpis.overdueCount ? plural(kpis.overdueCount, "parcela vencida", "parcelas vencidas") : "Nada vencido"}
          style={{ animationDelay: "120ms" }}
        />
        <KpiCard
          label="Clientes ativos"
          code="04"
          icon={<Users />}
          value={kpis.activeClients}
          caption="Com saldo em aberto"
          style={{ animationDelay: "180ms" }}
        />
        <KpiCard
          label="Parcelas pendentes"
          code="05"
          icon={<Layers3 />}
          value={kpis.pendingInstallments}
          caption={kpis.nextDue ? `Próxima em ${formatDate(kpis.nextDue).slice(0, 5)}` : "Nenhuma a vencer"}
          style={{ animationDelay: "240ms" }}
        />
      </div>

      {views.length > 0 && (
        <div className="mb-8 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <Panel title="Próximas cobranças" code="due" bodyClassName="p-2 sm:p-2">
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<Inbox />}
                title="Tudo em dia"
                description="Nenhuma parcela em aberto no momento."
                className="py-8"
              />
            ) : (
              <ul>
                {upcoming.map((item) => (
                  <ChargeLine
                    key={item.installment.id}
                    item={item}
                    action={
                      <ChargeButton
                        overdue={item.installment.status === "atrasado"}
                        onClick={() => charge(item.view.client.id, item.installment.id)}
                        className="h-8 pl-2 pr-3 text-[10.5px]"
                        aria-label={`Cobrar ${item.view.client.fullName}`}
                      />
                    }
                  >
                    <span className="tabular">vence {formatDate(item.installment.dueDate)}</span>
                    <StatusBadge status={item.installment.status} short className="ml-2 hidden h-5 sm:inline-flex" />
                  </ChargeLine>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recebimentos recentes" code="in" bodyClassName="p-2 sm:p-2">
            {recent.length === 0 ? (
              <EmptyState
                icon={<CircleDollarSign />}
                title="Nenhum recebimento ainda"
                description="Ao marcar uma parcela como paga, ela aparece aqui."
                className="py-8"
              />
            ) : (
              <ul>
                {recent.map((item) => (
                  <ChargeLine key={item.installment.id} item={item} paid>
                    <span className="tabular">pago em {formatDate(item.installment.payment!.paidAt)}</span>
                  </ChargeLine>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-display text-xl font-[800] tracking-[-0.04em]">Clientes</h2>
        {views.length > 0 && (
          <Link to="/clientes" className={buttonClass("ghost", "sm")}>
            Ver página <ArrowRight />
          </Link>
        )}
      </div>
      <ClientList views={views} />
    </>
  );
}

function ChargeLine({
  item,
  children,
  action,
  paid,
}: {
  item: ChargeItem;
  children: React.ReactNode;
  action?: React.ReactNode;
  paid?: boolean;
}) {
  const { view, installment } = item;
  return (
    <li className="relative flex items-center gap-3 rounded-[14px] px-2.5 py-2.5 transition-colors hover:bg-creme-100">
      <ClientAvatar name={view.client.fullName} status={paid ? "pago" : installment.status} className="size-9" />
      <div className="min-w-0 flex-1">
        <Link
          to={`/clientes/${view.client.id}`}
          className="block truncate text-sm font-semibold after:absolute after:inset-0 hover:text-laranja-700"
        >
          {view.client.fullName}
        </Link>
        <p className="flex items-center truncate font-mono text-[11.5px] text-cafe-300">
          {installment.number}/{installment.total} · {children}
        </p>
      </div>
      <p className={`tabular font-mono text-sm font-semibold ${paid ? "text-oliva-700" : ""}`}>
        {paid ? "+ " : ""}
        {formatBRL(installment.amountCents)}
      </p>
      {action && <div className="relative z-10">{action}</div>}
    </li>
  );
}
