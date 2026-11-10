import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  Hourglass,
  Inbox,
  Layers3,
  LineChart,
  MessageCircle,
  Plus,
  TriangleAlert,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "@/auth/AuthProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { ChargeButton } from "@/components/ui/ChargeButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/data/DataProvider";
import { recentPayments, upcomingCharges, type ChargeItem } from "@/domain/finance";
import { dailySeries, upcomingDueSeries } from "@/domain/series";
import { useCharge } from "@/features/charge/ChargeProvider";
import { ClientAvatar } from "@/features/clients/ClientRow";
import { ClientList } from "@/features/clients/ClientList";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/format";

const longDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const compactBRL = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function Dashboard() {
  const { views, kpis, today } = useData();
  const { displayName } = useAuth();
  const charge = useCharge();

  const upcoming = upcomingCharges(views, 5);
  const recent = recentPayments(views, 5);
  const series = useMemo(() => dailySeries(views, today, 30), [views, today]);
  const toReceiveSpark = useMemo(() => upcomingDueSeries(views, today, 30), [views, today]);
  const receivedSpark = series.map((p) => p.receivedAcc);
  const paidCount = views.reduce((n, v) => n + v.installments.filter((i) => i.payment).length, 0);
  const mostUrgent = upcoming[0];

  const firstName = displayName ? displayName.split(/\s+/)[0] : null;

  return (
    <>
      <PageHeader
        title="Painel"
        eyebrow={longDate.format(new Date(`${today}T00:00:00Z`))}
        heading={
          <>
            Olá{firstName ? ", " : ""}
            <span className="text-gold-metal capitalize">{firstName ?? ""}</span>
            <span className="text-gold">.</span>
          </>
        }
        description="Aqui está o resumo da sua operação hoje."
        actions={
          <Link to="/clientes/novo" className={buttonClass("primary", "lg", "max-lg:hidden")}>
            <Plus /> Novo cliente
          </Link>
        }
      />

      {/* Indicadores */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          accent="cyan"
          label="Total a receber"
          icon={<Wallet />}
          value={kpis.toReceiveCents}
          money
          spark={toReceiveSpark}
          caption={plural(kpis.pendingInstallments, "parcela em aberto", "parcelas em aberto")}
          className="col-span-2 lg:col-span-1 xl:col-span-2"
        />
        <KpiCard
          accent="gold"
          label="Total recebido"
          icon={<CircleDollarSign />}
          value={kpis.receivedCents}
          money
          spark={receivedSpark}
          caption="Entradas + parcelas pagas"
          className="col-span-2 lg:col-span-1 xl:col-span-2"
          style={{ animationDelay: "50ms" }}
        />
        <KpiCard
          accent="danger"
          label="Em atraso"
          icon={<Hourglass />}
          value={kpis.overdueCents}
          money
          caption={kpis.overdueCount ? plural(kpis.overdueCount, "parcela vencida", "parcelas vencidas") : "Nada vencido"}
          className="col-span-2 lg:col-span-1 xl:col-span-2"
          style={{ animationDelay: "100ms" }}
        />
        <KpiCard
          label="Clientes ativos"
          icon={<Users />}
          value={kpis.activeClients}
          caption="Com saldo em aberto"
          className="xl:col-span-2"
          style={{ animationDelay: "150ms" }}
        />
        <KpiCard
          label="Parcelas pendentes"
          icon={<Layers3 />}
          value={kpis.pendingInstallments}
          caption={kpis.nextDue ? `Próxima em ${formatDate(kpis.nextDue).slice(0, 5)}` : "Nenhuma a vencer"}
          className="xl:col-span-2"
          style={{ animationDelay: "200ms" }}
        />
        <KpiCard
          accent="success"
          label="Parcelas pagas"
          icon={<BadgeCheck />}
          value={paidCount}
          caption="Total registrado"
          className="col-span-2 lg:col-span-1 xl:col-span-2"
          style={{ animationDelay: "250ms" }}
        />
      </div>

      {/* Gráfico + ações rápidas */}
      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          title="Evolução das cobranças"
          icon={<LineChart />}
          actions={<span className="text-xs text-mist-600">Últimos 30 dias</span>}
          bodyClassName="p-3 pt-4 sm:p-4"
        >
          <EvolutionChart data={series} />
        </Panel>

        <Panel title="Ações rápidas" icon={<Zap />} bodyClassName="grid grid-cols-2 gap-3 p-4">
          <QuickAction to="/clientes/novo" icon={<UserPlus />} label="Novo cliente" />
          <QuickAction
            onClick={mostUrgent ? () => charge(mostUrgent.view.client.id, mostUrgent.installment.id) : undefined}
            icon={<MessageCircle />}
            label={mostUrgent ? "Cobrar mais urgente" : "Nada a cobrar"}
            accent
          />
          <QuickAction to="/clientes?situacao=atrasado" icon={<TriangleAlert />} label="Ver atrasados" />
          <QuickAction to="/clientes" icon={<ArrowRight />} label="Todos os clientes" />
        </Panel>
      </div>

      {/* Listas */}
      {views.length > 0 && (
        <div className="mb-8 grid gap-5 lg:grid-cols-2">
          <Panel title="Próximas cobranças" icon={<Clock3 />} bodyClassName="p-2">
            {upcoming.length === 0 ? (
              <EmptyState icon={<Inbox />} title="Tudo em dia" description="Nenhuma parcela em aberto no momento." className="py-8" />
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
                        className="h-8 px-2.5 text-[10.5px]"
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

          <Panel title="Recebimentos recentes" icon={<CircleDollarSign />} bodyClassName="p-2">
            {recent.length === 0 ? (
              <EmptyState
                icon={<CircleDollarSign />}
                title="Nenhum recebimento ainda"
                description="Ao registrar um pagamento, ele aparece aqui."
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
        <h2 className="text-xl font-bold tracking-[-0.02em]">Clientes</h2>
        {views.length > 0 && (
          <Link to="/clientes" className={buttonClass("ghost", "sm")}>
            Ver todos <ArrowRight />
          </Link>
        )}
      </div>
      <ClientList views={views} />
    </>
  );
}

function EvolutionChart({ data }: { data: ReturnType<typeof dailySeries> }) {
  const empty = data.every((d) => d.receivedAcc === 0 && d.dueAcc === 0);
  if (empty) {
    return (
      <div className="grid h-[260px] place-items-center text-center">
        <div>
          <p className="text-sm font-semibold">Sem movimentação nos últimos 30 dias</p>
          <p className="mt-1 text-xs text-mist-600">Vencimentos e recebimentos aparecem aqui conforme forem registrados.</p>
        </div>
      </div>
    );
  }
  const chart = data.map((d) => ({
    dia: d.date.slice(8, 10) + "/" + d.date.slice(5, 7),
    recebido: d.receivedAcc / 100,
    vencido: d.dueAcc / 100,
  }));
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 px-2 text-xs text-mist">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-gold shadow-[0_0_6px_#d9a441]" /> Recebido (acumulado)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-cyan shadow-[0_0_6px_#35ddfb]" /> Vencimentos (acumulado)
        </span>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#d9a441" stopOpacity={0.35} />
                <stop offset="1" stopColor="#d9a441" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#35ddfb" stopOpacity={0.22} />
                <stop offset="1" stopColor="#35ddfb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="dia" tick={{ fill: "#6b737c", fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
            <YAxis
              tick={{ fill: "#6b737c", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => compactBRL.format(v)}
            />
            <Tooltip
              cursor={{ stroke: "rgba(217,164,65,0.35)" }}
              contentStyle={{
                background: "rgba(10,10,11,0.95)",
                border: "1px solid rgba(217,164,65,0.35)",
                borderRadius: 12,
                color: "#f2f5f7",
                fontSize: 12,
              }}
              labelStyle={{ color: "#9aa3ad" }}
              formatter={(v, name) => [formatBRL(Math.round(Number(v) * 100)), name === "recebido" ? "Recebido" : "Vencimentos"]}
            />
            <Area type="monotone" dataKey="vencido" stroke="#35ddfb" strokeWidth={2} fill="url(#gCyan)" animationDuration={600} />
            <Area type="monotone" dataKey="recebido" stroke="#d9a441" strokeWidth={2.4} fill="url(#gGold)" animationDuration={600} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  onClick,
  icon,
  label,
  accent,
}: {
  to?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  accent?: boolean;
}) {
  const cls = cn(
    "flex aspect-[4/3] flex-col items-center justify-center gap-2.5 rounded-xl border p-3 text-center text-[13px] font-semibold transition-[border-color,background-color,color,box-shadow] duration-200",
    "[&_svg]:size-6 [&_svg]:stroke-[1.8]",
    accent
      ? "border-cyan/30 bg-cyan/[0.05] text-cyan-300 hover:border-cyan hover:shadow-[0_0_24px_-8px_rgba(53,221,251,0.8)]"
      : "border-white/10 bg-white/[0.03] text-ice hover:border-gold/40 hover:text-gold-200 hover:shadow-[0_0_24px_-10px_rgba(217,164,65,0.8)]",
    !to && !onClick && "pointer-events-none opacity-40",
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {icon}
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}

function ChargeLine({
  item,
  children,
  action,
  paid,
}: {
  item: ChargeItem;
  children: ReactNode;
  action?: ReactNode;
  paid?: boolean;
}) {
  const { view, installment } = item;
  return (
    <li className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <ClientAvatar name={view.client.fullName} status={paid ? "pago" : installment.status} className="size-9" />
      <div className="min-w-0 flex-1">
        <Link
          to={`/clientes/${view.client.id}`}
          className="block truncate text-sm font-semibold after:absolute after:inset-0 hover:text-gold-200"
        >
          {view.client.fullName}
        </Link>
        <p className="flex items-center truncate text-xs text-mist-600">
          {installment.number}/{installment.total} · {children}
        </p>
      </div>
      <p className={cn("tabular text-sm font-semibold", paid && "text-success")}>
        {paid ? "+ " : ""}
        {formatBRL(installment.amountCents)}
      </p>
      {action && <div className="relative z-10">{action}</div>}
    </li>
  );
}
