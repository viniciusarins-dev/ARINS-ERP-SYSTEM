import {
  Calculator,
  ClipboardCopy,
  ExternalLink,
  ListPlus,
  Minus,
  Plus,
  Save,
  Settings2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, Input, inputBase } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Panel } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/Toaster";
import { useData } from "@/data/DataProvider";
import {
  BUDGET_CATALOG,
  budgetClientMessage,
  calculateBudget,
  DEFAULT_BUDGET_SETTINGS,
  defaultSelections,
  describeDuration,
  type BudgetSelections,
  type BudgetSettings,
  type CatalogItem,
  type CustomTopic,
} from "@/domain/budget";
import { formatPhone, maskPhoneInput, validatePhone, whatsappLink } from "@/domain/phone";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";

import { NotFound } from "./NotFound";

const hoursLabel = (h: number) => `${String(h).replace(".", ",")}h`;

export function BudgetEditorPage() {
  const { id } = useParams();
  const { budgets, saveBudget } = useData();
  const existing = id ? budgets.find((b) => b.id === id) : undefined;
  if (id && !existing) return <NotFound what="orçamento" />;
  return <BudgetEditor key={existing?.id ?? "novo"} existing={existing} onSave={saveBudget} />;
}

type EditorProps = {
  existing?: ReturnType<typeof useData>["budgets"][number];
  onSave: ReturnType<typeof useData>["saveBudget"];
};

function BudgetEditor({ existing, onSave }: EditorProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [clientName, setClientName] = useState(existing?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(existing?.clientPhone ? formatPhone(existing.clientPhone) : "");
  const [selections, setSelections] = useState<BudgetSelections>(existing?.selections ?? defaultSelections());
  const [topics, setTopics] = useState<CustomTopic[]>(existing?.topics ?? []);
  const [settings, setSettings] = useState<BudgetSettings>(
    existing
      ? { hourlyRateCents: existing.hourlyRateCents, hoursPerDay: existing.hoursPerDay, marginPercent: existing.marginPercent }
      : DEFAULT_BUDGET_SETTINGS,
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const result = useMemo(() => calculateBudget(selections, topics, settings), [selections, topics, settings]);
  const phone = clientPhone ? validatePhone(clientPhone) : null;
  const message = budgetClientMessage({ title: title || "—", clientName, result, formatMoney: formatBRL });

  const setSel = (key: string, value: boolean | string | number) => setSelections((s) => ({ ...s, [key]: value }));

  const save = async () => {
    if (!title.trim()) {
      setTitleError("Dê um nome ao projeto.");
      document.querySelector<HTMLInputElement>("[data-budget-title]")?.focus();
      return;
    }
    if (settings.hourlyRateCents <= 0) {
      toast({ title: "Informe o valor da hora", tone: "warning" });
      return;
    }
    if (phone && !phone.ok) {
      toast({ title: "WhatsApp inválido", description: phone.error, tone: "warning" });
      return;
    }
    setSaving(true);
    try {
      const savedId = await onSave(
        {
          title: title.trim(),
          clientName: clientName.trim() || null,
          clientPhone: phone?.ok ? phone.national : null,
          selections,
          topics: topics.filter((t) => t.label.trim() && t.hours > 0),
          hourlyRateCents: settings.hourlyRateCents,
          hoursPerDay: settings.hoursPerDay,
          marginPercent: settings.marginPercent,
          totalHours: result.totalHours,
          totalCents: result.totalCents,
          notes: notes.trim() || null,
        },
        existing?.id,
      );
      toast({ title: existing ? "Orçamento atualizado" : "Orçamento salvo", description: `${title.trim()} · ${formatBRL(result.totalCents)}` });
      if (!existing) navigate(`/orcamentos/${savedId}`, { replace: true });
    } catch {
      toast({ title: "Não foi possível salvar o orçamento", tone: "warning" });
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: "Resumo copiado", description: "Cole na conversa com o cliente." });
    } catch {
      toast({ title: "Não foi possível copiar", tone: "warning" });
    }
  };

  const newClientHref = `/clientes/novo?${new URLSearchParams({
    ...(clientName.trim() ? { nome: clientName.trim() } : {}),
    ...(phone?.ok ? { whatsapp: phone.national } : {}),
    ...(title.trim() ? { projeto: title.trim() } : {}),
    ...(result.totalCents > 0 ? { valor: String(result.totalCents) } : {}),
  }).toString()}`;

  return (
    <>
      <PageHeader
        title={existing ? "Editar orçamento" : "Novo orçamento"}
        back={{ to: "/orcamentos", label: "Orçamentos" }}
        description="Marque o que o projeto precisa: horas, valor e prazo são calculados na hora."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Panel title="Projeto" icon={<Calculator />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do projeto" error={titleError ?? undefined} className="sm:col-span-2">
                {(fid, d) => (
                  <Input
                    id={fid}
                    data-budget-title=""
                    aria-describedby={d}
                    value={title}
                    invalid={Boolean(titleError)}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleError(null);
                    }}
                    placeholder="Ex.: Sistema de agendamento"
                    autoFocus={!existing}
                  />
                )}
              </Field>
              <Field label="Cliente (opcional)">
                {(fid) => <Input id={fid} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />}
              </Field>
              <Field label="WhatsApp (opcional)" error={phone && !phone.ok ? phone.error : undefined}>
                {(fid, d) => (
                  <Input
                    id={fid}
                    aria-describedby={d}
                    prefix="+55"
                    inputMode="tel"
                    value={clientPhone}
                    invalid={Boolean(phone && !phone.ok)}
                    onChange={(e) => setClientPhone(maskPhoneInput(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                )}
              </Field>
            </div>
          </Panel>

          {BUDGET_CATALOG.map((group) => (
            <Panel key={group.id} title={group.title} bodyClassName="p-2 sm:p-2">
              <ul>
                {group.items.map((item) => (
                  <CatalogRow key={item.id} item={item} value={selections[item.id]} onChange={(v) => setSel(item.id, v)} />
                ))}
              </ul>
            </Panel>
          ))}

          <Panel title="Tópicos personalizados" icon={<ListPlus />}>
            {topics.length === 0 && (
              <p className="mb-3 text-sm text-mist">Adicione partes específicas do projeto que não estão na lista, com as horas estimadas.</p>
            )}
            <ul className="flex flex-col gap-2.5">
              {topics.map((t, idx) => (
                <li key={t.id} className="flex items-center gap-2">
                  <input
                    aria-label={`Descrição do tópico ${idx + 1}`}
                    value={t.label}
                    onChange={(e) => setTopics((ts) => ts.map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)))}
                    placeholder="Ex.: Agenda com horários disponíveis"
                    className={cn(inputBase, "flex-1")}
                  />
                  <div className="relative w-28 shrink-0">
                    <input
                      aria-label={`Horas do tópico ${idx + 1}`}
                      inputMode="decimal"
                      value={t.hours ? String(t.hours).replace(".", ",") : ""}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
                        setTopics((ts) => ts.map((x) => (x.id === t.id ? { ...x, hours: Number.isFinite(n) ? Math.min(n, 999) : 0 } : x)));
                      }}
                      placeholder="0"
                      className={cn(inputBase, "pr-8 text-right")}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-mist-600">h</span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remover tópico ${idx + 1}`}
                    onClick={() => setTopics((ts) => ts.filter((x) => x.id !== t.id))}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-mist-600 transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus />}
              className="mt-3"
              onClick={() => setTopics((ts) => [...ts, { id: crypto.randomUUID(), label: "", hours: 0 }])}
            >
              Adicionar tópico
            </Button>
          </Panel>

          <Panel title="Parâmetros" icon={<Settings2 />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Valor da hora">
                {(fid) => (
                  <MoneyInput
                    id={fid}
                    value={settings.hourlyRateCents}
                    onValueChange={(v) => setSettings((s) => ({ ...s, hourlyRateCents: v }))}
                    invalid={settings.hourlyRateCents <= 0}
                  />
                )}
              </Field>
              <Field label="Horas de trabalho por dia">
                {(fid) => (
                  <NumberInput id={fid} value={settings.hoursPerDay} min={1} max={24} suffix="h" onChange={(v) => setSettings((s) => ({ ...s, hoursPerDay: v }))} />
                )}
              </Field>
              <Field label="Margem para imprevistos" hint="Somada às horas">
                {(fid, d) => (
                  <NumberInput
                    id={fid}
                    describedBy={d}
                    value={settings.marginPercent}
                    min={0}
                    max={200}
                    suffix="%"
                    onChange={(v) => setSettings((s) => ({ ...s, marginPercent: v }))}
                  />
                )}
              </Field>
            </div>
            <Field label="Observações internas (opcional)" className="mt-4">
              {(fid) => (
                <textarea
                  id={fid}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={cn(inputBase, "h-auto resize-y py-3")}
                  placeholder="Detalhes combinados, prioridades, ideias…"
                />
              )}
            </Field>
          </Panel>
        </div>

        {/* Resumo */}
        <Panel tone="dark" title="Resumo do orçamento" icon={<Calculator />} className="lg:sticky lg:top-24">
          <p className="eyebrow">Valor para o cliente</p>
          <p className="tabular mt-1 text-[40px] font-bold leading-none tracking-[-0.03em] text-gold-metal">{formatBRL(result.totalCents)}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Horas de trabalho" value={hoursLabel(result.totalHours)} />
            <Metric label="Prazo estimado" value={describeDuration(result.workDays).split(" (")[0]} sub={describeDuration(result.workDays).match(/\((.*)\)/)?.[1]} />
          </div>
          <p className="mt-3 text-xs text-mist-600">
            {formatBRL(settings.hourlyRateCents)}/hora · {String(settings.hoursPerDay).replace(".", ",")}h por dia
            {settings.marginPercent > 0 && ` · +${String(settings.marginPercent).replace(".", ",")}% de margem`}
          </p>

          <div className="my-5 border-t border-dashed border-white/10" />
          {result.lines.length === 0 ? (
            <p className="text-sm text-mist">Marque os itens do projeto para calcular.</p>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {result.lines.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 text-[13px]">
                  <span className="text-ice/90">
                    {l.label}
                    {l.detail && <span className="block text-xs text-mist-600">{l.detail}</span>}
                  </span>
                  <span className="tabular shrink-0 font-semibold text-gold-200">{hoursLabel(l.hours)}</span>
                </li>
              ))}
              {result.marginHours > 0 && (
                <li className="flex justify-between gap-3 text-[13px] text-mist">
                  <span>Margem para imprevistos</span>
                  <span className="tabular font-semibold">{hoursLabel(result.marginHours)}</span>
                </li>
              )}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" icon={<Save />} loading={saving} onClick={() => void save()}>
              {existing ? "Salvar alterações" : "Salvar orçamento"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" icon={<ClipboardCopy />} onClick={() => void copy()} disabled={result.totalCents === 0}>
                Copiar resumo
              </Button>
              <Button
                variant="dark"
                icon={<ExternalLink />}
                disabled={!phone?.ok || result.totalCents === 0}
                title={phone?.ok ? undefined : "Informe o WhatsApp do cliente"}
                onClick={() => phone?.ok && window.open(whatsappLink(phone.national, message), "_blank", "noopener,noreferrer")}
              >
                WhatsApp
              </Button>
            </div>
            <Link
              to={newClientHref}
              className={buttonClass("ghost", "md", cn("justify-center", result.totalCents === 0 && "pointer-events-none opacity-40"))}
            >
              <UserPlus /> Fechou? Cadastrar cliente com este valor
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-mist-600">{sub}</p>}
    </div>
  );
}

function NumberInput({
  id,
  describedBy,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  id: string;
  describedBy?: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        aria-describedby={describedBy}
        inputMode="decimal"
        value={String(value).replace(".", ",")}
        onChange={(e) => {
          const n = parseFloat(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
          onChange(Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min);
        }}
        className={cn(inputBase, "pr-9")}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-mist-600">{suffix}</span>
    </div>
  );
}

function CatalogRow({
  item,
  value,
  onChange,
}: {
  item: CatalogItem;
  value: boolean | string | number | undefined;
  onChange: (v: boolean | string | number) => void;
}) {
  let control: ReactNode;
  let hours: number;

  if (item.kind === "toggle") {
    const on = value === true;
    hours = on ? item.hours : 0;
    control = (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={item.label}
        onClick={() => onChange(!on)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200",
          on ? "border-gold/60 bg-gold/30" : "border-white/15 bg-white/[0.05]",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-5 -translate-y-1/2 rounded-full transition-[left,background-color] duration-200",
            on ? "left-[24px] bg-gold shadow-[0_0_10px_rgba(217,164,65,0.9)]" : "left-1 bg-mist-600",
          )}
        />
      </button>
    );
  } else if (item.kind === "select") {
    const current = typeof value === "string" ? value : item.options[0].value;
    hours = item.options.find((o) => o.value === current)?.hours ?? 0;
    control = (
      <div role="radiogroup" aria-label={item.label} className="flex flex-wrap gap-1.5">
        {item.options.map((o) => {
          const active = o.value === current;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "h-8 rounded-lg border px-3 text-[13px] font-semibold transition-colors",
                active ? "border-gold/50 bg-gold/[0.14] text-gold-200" : "border-white/10 text-mist hover:border-white/25 hover:text-ice",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  } else {
    const n = typeof value === "number" ? value : 0;
    hours = n * item.hoursPerUnit;
    const set = (v: number) => onChange(Math.min(Math.max(v, 0), item.max ?? 99));
    control = (
      <div className="flex h-9 items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
        <button type="button" aria-label={`Diminuir ${item.label}`} onClick={() => set(n - 1)} disabled={n <= 0} className="grid w-9 place-items-center text-mist hover:bg-white/[0.06] hover:text-gold disabled:opacity-30">
          <Minus className="size-4" />
        </button>
        <input
          aria-label={item.label}
          inputMode="numeric"
          value={n}
          onChange={(e) => set(parseInt(e.target.value.replace(/\D/g, "") || "0", 10))}
          className="tabular w-12 bg-transparent text-center text-sm font-bold text-ice focus:outline-none"
        />
        <button type="button" aria-label={`Aumentar ${item.label}`} onClick={() => set(n + 1)} className="grid w-9 place-items-center text-mist hover:bg-white/[0.06] hover:text-gold">
          <Plus className="size-4" />
        </button>
      </div>
    );
  }

  const unitHint =
    item.kind === "quantity" ? `${hoursLabel(item.hoursPerUnit)} por ${item.unit}` : item.kind === "toggle" ? hoursLabel(item.hours) : undefined;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.025]">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-medium text-ice">{item.label}</p>
        <p className="text-xs text-mist-600">{item.hint ?? unitHint}</p>
      </div>
      <div className="flex items-center gap-3">
        {control}
        <span className={cn("tabular w-12 text-right text-sm font-semibold", hours > 0 ? "text-gold-200" : "text-mist-700")}>
          {hours > 0 ? `+${hoursLabel(hours)}` : "—"}
        </span>
      </div>
    </li>
  );
}
