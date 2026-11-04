import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Hourglass,
  Layers3,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo, LogoMark } from "@/components/brand/Logo";
import { Sparkle } from "@/components/brand/Sparkle";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ChargeButton } from "@/components/ui/ChargeButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { KpiCard } from "@/components/ui/KpiCard";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toast } from "@/components/ui/Toast";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/format";
import type { FinancialStatus } from "@/types/status";

/*
 * ⚠ DADOS FICTÍCIOS — usados apenas para visualizar a identidade visual.
 * Esta página não faz parte do fluxo de produção.
 */
const demoClients: {
  name: string;
  project: string;
  remaining: number;
  due: string;
  status: FinancialStatus;
}[] = [
  { name: "Cliente Exemplo A", project: "Site institucional", remaining: 150000, due: "2026-11-01", status: "atrasado" },
  { name: "Cliente Exemplo B", project: "Sistema de agendamento", remaining: 320000, due: "2026-11-06", status: "proximo" },
  { name: "Cliente Exemplo C", project: "Landing page", remaining: 60000, due: "2026-11-20", status: "em_dia" },
  { name: "Cliente Exemplo D", project: "Loja virtual", remaining: 0, due: "2026-10-15", status: "pago" },
];

const palette = [
  { name: "Marrom escuro", token: "noite", hex: "#261B17", role: "Base, bordas, superfícies escuras", text: "text-creme" },
  { name: "Marrom café", token: "cafe", hex: "#493126", role: "Texto secundário, apoio", text: "text-creme" },
  { name: "Laranja vibrante", token: "laranja", hex: "#D66B35", role: "Ação, atenção, marca", text: "text-noite" },
  { name: "Verde oliva", token: "oliva", hex: "#A6B87A", role: "Pago, confirmação", text: "text-noite" },
  { name: "Creme", token: "creme", hex: "#F2E5CC", role: "Fundo principal", text: "text-noite" },
];

export function StyleGuide() {
  const [hadDownPayment, setHadDownPayment] = useState<"sim" | "nao">("sim");
  const [plan, setPlan] = useState<"avista" | "semanal" | "mensal">("mensal");
  const [total, setTotal] = useState(200000);
  const [entry, setEntry] = useState(50000);
  const remaining = Math.max(total - (hadDownPayment === "sim" ? entry : 0), 0);

  return (
    <AppShell active="identidade">
      {/* HERO */}
      <section className="relative mb-10 overflow-hidden rounded-[28px] border-[1.5px] border-noite bg-noite text-creme shadow-hard-lg">
        <div className="dot-grid absolute inset-0" aria-hidden="true" />
        <div
          className="absolute -right-24 -top-24 size-80 rounded-full bg-[radial-gradient(circle,rgba(214,107,53,0.45),transparent_65%)]"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 p-6 sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-chip border border-creme/20 bg-creme/5 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-creme/70">
              <span className="size-1.5 rounded-full bg-oliva" /> Etapa 1 · Identidade visual
            </span>
            <h1 className="font-display text-[40px] font-[800] leading-[0.95] tracking-[-0.045em] sm:text-[64px]">
              {brand.name.toLowerCase()}
              <span className="text-laranja">.</span>
              <span className="chrome ml-3 inline-block translate-y-[-0.5em] rounded-chip border-[1.5px] border-noite px-2.5 py-0.5 align-middle font-pixel text-sm tracking-normal text-noite sm:text-base">
                {brand.suffix}
              </span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-creme/70">
              {brand.tagline}. Software de 2003 reconstruído com o rigor de um SaaS atual: bordas firmes, sombras
              físicas, cromado só nos detalhes e laranja onde existe ação.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <LogoMark size="lg" className="hidden md:inline-grid" />
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button variant="primary" icon={<Plus />}>
                Novo cliente
              </Button>
              <ChargeButton />
            </div>
          </div>
        </div>
        {/* ticker */}
        <div className="relative overflow-hidden border-t-[1.5px] border-creme/10 bg-noite-800 py-2.5 scanlines">
          <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-pixel text-[11px] text-creme/50">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-8">
                {["Pago", "Em dia", "Próximo do vencimento", "Atrasado", "Cobrar", "R$ 0,00", brand.fullName, brand.version].map(
                  (t) => (
                    <span key={t} className="flex items-center gap-8">
                      {t}
                      <Sparkle className="size-2.5 text-laranja" />
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 01 PALETA */}
      <Section index="01" title="Paleta" description="Cinco cores, sem exceção. Derivados claros/escuros só para estados.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {palette.map((c) => (
            <div key={c.token} className="overflow-hidden rounded-panel border-[1.5px] border-noite bg-creme-50 shadow-hard">
              <div className={cn("flex h-28 items-end justify-between p-3", c.text)} style={{ background: c.hex }}>
                <span className="font-pixel text-[10px] opacity-70">{c.token}</span>
                <span className="font-mono text-xs font-semibold">{c.hex}</span>
              </div>
              <div className="border-t-[1.5px] border-noite p-3">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-cafe-300">{c.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 02 TIPOGRAFIA */}
      <Section index="02" title="Tipografia" description="Display expressiva para números e títulos; sans legível para leitura; mono para rótulos.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Display · Unbounded" code="800/700">
            <p className="font-display text-5xl font-[800] tracking-[-0.045em]">Aa</p>
            <p className="tabular mt-3 font-display text-2xl font-bold tracking-[-0.03em]">R$ 12.480,00</p>
            <p className="mt-2 text-xs text-cafe-300">Títulos, valores e indicadores.</p>
          </Panel>
          <Panel title="Texto · Instrument Sans" code="400–600">
            <p className="text-5xl font-semibold tracking-[-0.03em]">Aa</p>
            <p className="mt-3 text-[15px] leading-relaxed">
              Parcela 2 de 3 do projeto Site institucional, com vencimento em 10/11/2026.
            </p>
          </Panel>
          <Panel title="Rótulo · JetBrains Mono" code="mono">
            <p className="font-mono text-5xl font-semibold">Aa</p>
            <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cafe">
              Próximo vencimento
            </p>
            <p className="mt-2 font-pixel text-xs text-cafe-300">Silkscreen · detalhes de sistema</p>
          </Panel>
        </div>
      </Section>

      {/* 03 BOTÕES */}
      <Section index="03" title="Botões" description="Peso físico: sombra dura que some ao pressionar. COBRAR tem forma própria.">
        <Panel title="Ações" code="btn">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<Plus />}>Novo cliente</Button>
            <Button variant="dark" icon={<CircleDollarSign />}>
              Registrar pagamento
            </Button>
            <Button variant="secondary" icon={<Pencil />}>
              Editar
            </Button>
            <Button variant="danger" icon={<Trash2 />}>
              Excluir
            </Button>
            <Button variant="ghost" iconRight={<ArrowRight />}>
              Ver todos
            </Button>
            <Button loading>Salvando</Button>
            <Button variant="secondary" disabled>
              Desabilitado
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t-[1.5px] border-dashed border-noite/15 pt-6">
            <ChargeButton size="lg" />
            <ChargeButton />
            <ChargeButton overdue>Cobrar atraso</ChargeButton>
            <span className="font-mono text-[11px] text-cafe-300">← abre o WhatsApp com a mensagem pronta</span>
          </div>
        </Panel>
      </Section>

      {/* 04 STATUS */}
      <Section index="04" title="Situação financeira" description="Cada estado tem cor e comportamento de LED próprios — legível até sem cor.">
        <Panel title="Status" code="led">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["pago", "Todas as parcelas quitadas.", "LED aceso"],
                ["em_dia", "Próximo vencimento a mais de 3 dias.", "LED aceso"],
                ["proximo", "Vence nos próximos 3 dias.", "LED pulsando"],
                ["atrasado", "Vencimento passou sem pagamento.", "LED piscando"],
              ] as [FinancialStatus, string, string][]
            ).map(([s, desc, led]) => (
              <div key={s} className="rounded-2xl border-[1.5px] border-noite/15 bg-creme-100 p-4">
                <StatusBadge status={s} />
                <p className="mt-3 text-sm">{desc}</p>
                <p className="mt-1 font-pixel text-[10px] text-cafe-300">{led}</p>
              </div>
            ))}
          </div>
        </Panel>
      </Section>

      {/* 05 INDICADORES */}
      <Section
        index="05"
        title="Indicadores"
        description="Composição do topo do painel."
        badge={<DemoBadge />}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard tone="dark" label="A receber" code="02" icon={<Wallet />} value={530000} money caption="7 parcelas em aberto" className="col-span-2 lg:col-span-1" />
          <KpiCard label="Recebido" code="01" icon={<CircleDollarSign />} value={1248000} money caption="Total histórico" style={{ animationDelay: "60ms" }} />
          <KpiCard tone="accent" label="Em atraso" code="03" icon={<Hourglass />} value={150000} money caption="1 parcela vencida" style={{ animationDelay: "120ms" }} />
          <KpiCard label="Clientes ativos" code="04" icon={<Users />} value={3} caption="Com saldo em aberto" style={{ animationDelay: "180ms" }} />
          <KpiCard label="Parcelas pendentes" code="05" icon={<Layers3 />} value={7} caption="Próx. em 06/11" style={{ animationDelay: "240ms" }} />
        </div>
      </Section>

      {/* 06 LISTA DE CLIENTES */}
      <Section index="06" title="Lista de clientes" description="Linha densa no desktop, cartão no celular. COBRAR sempre ao alcance." badge={<DemoBadge />}>
        <Panel title="Clientes" code="cli/04" bodyClassName="p-0 sm:p-0">
          <div className="flex flex-col gap-3 border-b-[1.5px] border-noite/10 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cafe-300" />
              <Input placeholder="Buscar cliente pelo nome" className="pl-10" aria-label="Buscar cliente" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["Todos", "Atrasado", "Próximo", "Em dia", "Pago"].map((f, i) => (
                <button
                  key={f}
                  className={cn(
                    "h-9 shrink-0 rounded-chip border-[1.5px] px-3.5 text-[13px] font-semibold transition-colors",
                    i === 0 ? "border-noite bg-noite text-creme" : "border-noite/20 text-cafe hover:border-noite/50",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <ul>
            {demoClients.map((c) => (
              <ClientRow key={c.name} {...c} />
            ))}
          </ul>
        </Panel>
      </Section>

      {/* 07 FORMULÁRIO */}
      <Section index="07" title="Formulário" description="Máscara monetária de caixa registradora e chaves segmentadas. O restante é calculado ao vivo.">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Panel title="Novo cliente" code="form">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo">{(id) => <Input id={id} placeholder="Nome do cliente" />}</Field>
              <Field label="WhatsApp" hint="Com DDD">
                {(id, d) => <Input id={id} aria-describedby={d} prefix="+55" placeholder="(00) 00000-0000" inputMode="tel" />}
              </Field>
              <Field label="Valor total" className="sm:col-span-1">
                {(id) => <MoneyInput id={id} value={total} onValueChange={setTotal} />}
              </Field>
              <Field label="Teve entrada?">
                {() => (
                  <Segmented
                    ariaLabel="Teve entrada?"
                    value={hadDownPayment}
                    onChange={setHadDownPayment}
                    options={[
                      { value: "sim", label: "Sim" },
                      { value: "nao", label: "Não" },
                    ]}
                  />
                )}
              </Field>
              {hadDownPayment === "sim" && (
                <Field label="Valor da entrada" className="animate-rise">
                  {(id) => <MoneyInput id={id} value={entry} onValueChange={setEntry} />}
                </Field>
              )}
              <Field label="Forma de pagamento" className="sm:col-span-2">
                {() => (
                  <Segmented
                    ariaLabel="Forma de pagamento"
                    value={plan}
                    onChange={setPlan}
                    className="w-full"
                    options={[
                      { value: "avista", label: "À vista", icon: <Zap /> },
                      { value: "semanal", label: "Semanal", icon: <Repeat /> },
                      { value: "mensal", label: "Mensal", icon: <CalendarDays /> },
                    ]}
                  />
                )}
              </Field>
            </div>
          </Panel>

          <Panel tone="dark" title="Resumo" code="calc" bodyClassName="dot-grid">
            <dl className="space-y-3 font-mono text-sm">
              <SummaryRow label="Valor total" value={formatBRL(total)} />
              <SummaryRow label="Entrada" value={`− ${formatBRL(hadDownPayment === "sim" ? entry : 0)}`} />
            </dl>
            <div className="my-4 border-t-[1.5px] border-dashed border-creme/20" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-creme/55">Restante</p>
            <p className="tabular mt-1 font-display text-4xl font-[800] tracking-[-0.04em] text-laranja">
              {formatBRL(remaining)}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border-[1.5px] border-creme/15 bg-noite-800 p-2.5">
                  <p className="font-pixel text-[9px] text-creme/45">{n}/3</p>
                  <p className="tabular mt-1 font-mono text-[13px] font-semibold">
                    {formatBRL(Math.floor(remaining / 3) + (n <= remaining % 3 ? 1 : 0))}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-creme/45">Centavos distribuídos para a soma fechar exata.</p>
          </Panel>
        </div>
      </Section>

      {/* 08 PARCELAS */}
      <Section index="08" title="Parcelas" description="Linha do tempo das parcelas na página do cliente." badge={<DemoBadge />}>
        <Panel title="Parcelas · Cliente Exemplo A" code="3x">
          <ol className="relative space-y-3">
            <InstallmentRow n={1} total={3} value={50000} due="2026-10-01" status="pago" paidAt="2026-09-30" />
            <InstallmentRow n={2} total={3} value={50000} due="2026-11-01" status="atrasado" />
            <InstallmentRow n={3} total={3} value={50000} due="2026-12-01" status="em_dia" />
          </ol>
        </Panel>
      </Section>

      {/* 09 FEEDBACK & VAZIO */}
      <Section index="09" title="Feedback e estados vazios" description="Toda ação responde. Todo vazio orienta o próximo passo.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Notificações" code="toast" bodyClassName="flex flex-col gap-3 bg-creme-100">
            <Toast title="Pagamento registrado" description="Parcela 2/3 · R$ 500,00 · indicadores atualizados." />
            <Toast tone="warning" title="Essa parcela já está paga" description="Nada foi registrado em duplicidade." />
          </Panel>
          <Panel title="Nenhum cliente" code="empty">
            <EmptyState
              icon={<Users />}
              title="Nenhum cliente por aqui"
              description="Cadastre o primeiro cliente e as parcelas são geradas automaticamente."
              action={<Button icon={<Plus />}>Cadastrar cliente</Button>}
            />
          </Panel>
        </div>
      </Section>

      {/* 10 ICONOGRAFIA */}
      <Section index="10" title="Iconografia" description="Lucide, traço 1.9–2.1, cantos arredondados. Ícones dentro de molduras quando têm destaque.">
        <Panel title="Ícones" code="lucide">
          <div className="flex flex-wrap gap-3">
            {[Wallet, CircleDollarSign, Hourglass, Users, Layers3, CalendarClock, Clock3, Search, Pencil, Trash2, Plus, Zap].map(
              (Icon, i) => (
                <span
                  key={i}
                  className={cn(
                    "grid size-11 place-items-center rounded-[12px] border-[1.5px] border-noite",
                    i % 4 === 0 ? "bg-noite text-laranja" : i % 4 === 2 ? "chrome text-noite" : "bg-creme-50 text-noite",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={1.9} />
                </span>
              ),
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-6 border-t-[1.5px] border-dashed border-noite/15 pt-6">
            <Logo size="lg" />
            <Logo size="md" />
            <div className="rounded-2xl bg-noite p-3">
              <Logo tone="light" size="sm" />
            </div>
          </div>
        </Panel>
      </Section>

      <footer className="mt-4 flex items-center gap-2 font-pixel text-[10px] text-cafe-300">
        <Sparkle className="size-3 text-laranja" /> {brand.fullName} {brand.version} · dados desta página são fictícios
      </footer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function Section({
  index,
  title,
  description,
  badge,
  children,
}: {
  index: string;
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2">
        <span className="font-pixel text-xs text-laranja">{index}</span>
        <h2 className="font-display text-2xl font-[800] tracking-[-0.04em] sm:text-[28px]">{title}</h2>
        {badge}
        <p className="w-full text-sm text-cafe-300 sm:w-auto sm:flex-1 sm:text-right">{description}</p>
      </div>
      {children}
    </section>
  );
}

function DemoBadge() {
  return (
    <span className="mb-1 inline-flex items-center rounded-chip border-[1.5px] border-dashed border-cafe-300 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-cafe-300">
      Dados fictícios
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-creme/55">{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function ClientRow({ name, project, remaining, due, status }: (typeof demoClients)[number]) {
  return (
    <li className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 border-b-[1.5px] border-noite/10 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-creme-100 md:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_8.5rem_8.5rem] md:gap-x-5">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-[12px] border-[1.5px] border-noite font-display text-xs font-bold",
          status === "atrasado" ? "bg-noite text-laranja" : status === "pago" ? "bg-oliva text-noite" : "chrome text-noite",
        )}
      >
        {initials(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        <p className="truncate text-[13px] text-cafe-300">{project}</p>
      </div>
      <div className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto">
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-cafe-300 md:block">Restante</p>
        <p className="tabular text-right font-mono text-sm font-semibold md:text-left">{formatBRL(remaining)}</p>
      </div>
      <div className="col-span-2 col-start-2 flex items-center gap-3 md:col-span-1 md:col-start-auto md:block">
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-cafe-300 md:block">Próx. vencimento</p>
        <p className="tabular font-mono text-sm">{remaining ? formatDate(due) : "—"}</p>
        <StatusBadge status={status} short className="md:hidden" />
      </div>
      <StatusBadge status={status} short className="hidden justify-self-start md:inline-flex" />
      <div className="col-span-3 flex justify-end md:col-span-1">
        {status === "pago" ? (
          <Button variant="ghost" size="sm" iconRight={<ArrowRight />}>
            Detalhes
          </Button>
        ) : (
          <ChargeButton overdue={status === "atrasado"} className="w-full justify-center md:w-auto" />
        )}
      </div>
    </li>
  );
}

function InstallmentRow({
  n,
  total,
  value,
  due,
  status,
  paidAt,
}: {
  n: number;
  total: number;
  value: number;
  due: string;
  status: FinancialStatus;
  paidAt?: string;
}) {
  const paid = status === "pago";
  return (
    <li className="relative flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border-[1.5px] border-noite/15 bg-creme-100 p-3 pl-3 sm:flex-nowrap">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[12px] border-[1.5px] border-noite font-display text-sm font-bold",
          paid ? "bg-oliva" : status === "atrasado" ? "bg-noite text-laranja" : "bg-creme-50",
        )}
      >
        {n}
        <span className="sr-only"> de {total}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="tabular font-display text-lg font-bold tracking-[-0.03em]">{formatBRL(value)}</p>
        <p className="font-mono text-xs text-cafe-300">
          Parcela {n}/{total} · vence {formatDate(due)}
          {paidAt && ` · paga em ${formatDate(paidAt)}`}
        </p>
      </div>
      <StatusBadge status={status} short />
      <div className="flex w-full gap-2 sm:w-auto">
        {paid ? (
          <Button variant="ghost" size="sm" disabled className="opacity-60">
            Recebido
          </Button>
        ) : (
          <>
            <Button variant="dark" size="sm" icon={<CircleDollarSign />} className="flex-1 sm:flex-none">
              Marcar paga
            </Button>
            <ChargeButton className="h-8 flex-1 justify-center text-[11px] sm:flex-none" />
          </>
        )}
      </div>
    </li>
  );
}
