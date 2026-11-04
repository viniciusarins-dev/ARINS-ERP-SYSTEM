import { CalendarDays, Lock, Minus, Plus, Repeat, Save, Zap } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import type { ClientInput } from "@/data/types";
import { addMonths, isValidISODate, type ISODate } from "@/domain/dates";
import type { ClientView } from "@/domain/finance";
import { formatPhone, maskPhoneInput, validatePhone } from "@/domain/phone";
import { generateSchedule, MAX_INSTALLMENTS, planLabel, type PaymentPlan } from "@/domain/schedule";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/format";

type FormState = {
  fullName: string;
  whatsapp: string;
  projectName: string;
  totalCents: number;
  hadEntry: "sim" | "nao";
  entryCents: number;
  plan: PaymentPlan;
  count: number;
  firstDueDate: ISODate;
};

type Errors = Partial<Record<keyof FormState, string>>;

function initialState(today: ISODate, view?: ClientView): FormState {
  if (!view || !view.project) {
    return {
      fullName: "",
      whatsapp: "",
      projectName: "",
      totalCents: 0,
      hadEntry: "nao",
      entryCents: 0,
      plan: "mensal",
      count: 3,
      firstDueDate: addMonths(today, 1),
    };
  }
  const p = view.project;
  return {
    fullName: view.client.fullName,
    whatsapp: formatPhone(view.client.whatsapp),
    projectName: p.name,
    totalCents: p.totalCents,
    hadEntry: p.downPaymentCents > 0 ? "sim" : "nao",
    entryCents: p.downPaymentCents,
    plan: p.plan,
    count: Math.max(p.installmentsCount, 1),
    firstDueDate: p.firstDueDate ?? view.installments[0]?.dueDate ?? addMonths(today, 1),
  };
}

type ClientFormProps = {
  today: ISODate;
  view?: ClientView;
  submitLabel: string;
  onSubmit: (input: ClientInput) => Promise<void>;
  onCancel: () => void;
};

export function ClientForm({ today, view, submitLabel, onSubmit, onCancel }: ClientFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(today, view));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const locked = Boolean(view?.installments.some((i) => i.payment));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const entry = form.hadEntry === "sim" ? form.entryCents : 0;
  const remaining = Math.max(form.totalCents - entry, 0);
  const count = form.plan === "avista" ? 1 : form.count;
  const datesOk = isValidISODate(form.firstDueDate);

  const schedule = useMemo(
    () =>
      remaining > 0 && datesOk && count >= 1 && count <= MAX_INSTALLMENTS
        ? generateSchedule({ remainingCents: remaining, plan: form.plan, count, firstDueDate: form.firstDueDate })
        : [],
    [remaining, datesOk, count, form.plan, form.firstDueDate],
  );

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.fullName.trim().length < 2) e.fullName = "Informe o nome do cliente.";
    const phone = validatePhone(form.whatsapp);
    if (!phone.ok) e.whatsapp = phone.error;
    if (!form.projectName.trim()) e.projectName = "Informe o site ou sistema desenvolvido.";
    if (form.totalCents <= 0) e.totalCents = "Informe o valor combinado.";
    if (form.hadEntry === "sim") {
      if (form.entryCents <= 0) e.entryCents = "Informe o valor da entrada.";
      else if (form.entryCents > form.totalCents) e.entryCents = "A entrada não pode ser maior que o total.";
    }
    if (remaining > 0) {
      if (form.plan !== "avista" && (!Number.isInteger(form.count) || form.count < 1 || form.count > MAX_INSTALLMENTS)) {
        e.count = `Entre 1 e ${MAX_INSTALLMENTS} parcelas.`;
      }
      if (!datesOk) e.firstDueDate = "Informe a data do vencimento.";
    }
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    const firstError = Object.keys(e)[0];
    if (firstError) {
      document.querySelector<HTMLElement>(`[data-field="${firstError}"] input`)?.focus();
      return;
    }
    const phone = validatePhone(form.whatsapp);
    const hasInstallments = remaining > 0;
    setSaving(true);
    try {
      await onSubmit({
        fullName: form.fullName.trim(),
        whatsapp: phone.ok ? phone.national : "",
        projectName: form.projectName.trim(),
        totalCents: form.totalCents,
        downPaymentCents: entry,
        plan: hasInstallments ? form.plan : "avista",
        installmentsCount: schedule.length,
        firstDueDate: hasInstallments ? form.firstDueDate : null,
        schedule,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <Panel title="Cliente" code="01">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" error={errors.fullName} className="sm:col-span-2" data-field="fullName">
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  invalid={Boolean(errors.fullName)}
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Nome do cliente"
                  autoComplete="off"
                  autoFocus={!view}
                />
              )}
            </Field>
            <Field label="WhatsApp" hint="Com DDD" error={errors.whatsapp} data-field="whatsapp">
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  invalid={Boolean(errors.whatsapp)}
                  prefix="+55"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="(00) 00000-0000"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", maskPhoneInput(e.target.value))}
                />
              )}
            </Field>
            <Field label="Site ou sistema" error={errors.projectName} data-field="projectName">
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  invalid={Boolean(errors.projectName)}
                  value={form.projectName}
                  onChange={(e) => set("projectName", e.target.value)}
                  placeholder="Ex.: Site institucional"
                  autoComplete="off"
                />
              )}
            </Field>
          </div>
        </Panel>

        <Panel title="Financeiro" code="02">
          {locked && (
            <p className="mb-4 flex items-start gap-2.5 rounded-xl border-[1.5px] border-noite/15 bg-creme-100 p-3 text-sm text-cafe">
              <Lock className="mt-0.5 size-4 shrink-0" />
              Já existem pagamentos registrados, por isso os valores e parcelas estão bloqueados para edição.
            </p>
          )}
          <fieldset disabled={locked} className="grid gap-4 disabled:opacity-60 sm:grid-cols-2">
            <Field label="Valor total combinado" error={errors.totalCents} data-field="totalCents">
              {(id, d) => (
                <MoneyInput
                  id={id}
                  aria-describedby={d}
                  invalid={Boolean(errors.totalCents)}
                  value={form.totalCents}
                  onValueChange={(v) => set("totalCents", v)}
                />
              )}
            </Field>
            <Field label="Teve entrada?">
              {() => (
                <Segmented
                  ariaLabel="Teve entrada?"
                  className="w-full"
                  value={form.hadEntry}
                  onChange={(v) => set("hadEntry", v)}
                  options={[
                    { value: "sim", label: "Sim" },
                    { value: "nao", label: "Não" },
                  ]}
                />
              )}
            </Field>
            {form.hadEntry === "sim" && (
              <Field label="Valor recebido de entrada" error={errors.entryCents} className="animate-rise" data-field="entryCents">
                {(id, d) => (
                  <MoneyInput
                    id={id}
                    aria-describedby={d}
                    invalid={Boolean(errors.entryCents)}
                    value={form.entryCents}
                    onValueChange={(v) => set("entryCents", v)}
                  />
                )}
              </Field>
            )}

            {remaining > 0 && (
              <>
                <Field label="Forma de pagamento" className="sm:col-span-2">
                  {() => (
                    <Segmented
                      ariaLabel="Forma de pagamento"
                      className="w-full"
                      value={form.plan}
                      onChange={(v) => set("plan", v)}
                      options={[
                        { value: "avista", label: "À vista", icon: <Zap /> },
                        { value: "semanal", label: "Semanal", icon: <Repeat /> },
                        { value: "mensal", label: "Mensal", icon: <CalendarDays /> },
                      ]}
                    />
                  )}
                </Field>
                {form.plan !== "avista" && (
                  <Field label="Quantidade de parcelas" error={errors.count} data-field="count">
                    {(id, d) => (
                      <Stepper
                        id={id}
                        describedBy={d}
                        value={form.count}
                        onChange={(v) => set("count", v)}
                        invalid={Boolean(errors.count)}
                      />
                    )}
                  </Field>
                )}
                <Field
                  label={form.plan === "avista" ? "Data do vencimento" : "Primeiro vencimento"}
                  error={errors.firstDueDate}
                  data-field="firstDueDate"
                >
                  {(id, d) => (
                    <Input
                      id={id}
                      aria-describedby={d}
                      invalid={Boolean(errors.firstDueDate)}
                      type="date"
                      value={form.firstDueDate}
                      onChange={(e) => set("firstDueDate", e.target.value)}
                    />
                  )}
                </Field>
              </>
            )}
          </fieldset>
        </Panel>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" loading={saving} icon={<Save />}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <Summary
        totalCents={form.totalCents}
        entryCents={entry}
        remaining={remaining}
        plan={form.plan}
        schedule={schedule}
      />
    </form>
  );
}

function Stepper({
  id,
  describedBy,
  value,
  onChange,
  invalid,
}: {
  id: string;
  describedBy?: string;
  value: number;
  onChange: (v: number) => void;
  invalid?: boolean;
}) {
  const btn =
    "grid size-11 shrink-0 place-items-center border-noite text-noite transition-colors hover:bg-creme-300/60 active:bg-creme-300 disabled:opacity-40";
  return (
    <div
      className={cn(
        "flex h-11 items-stretch overflow-hidden rounded-control border-[1.5px] border-noite bg-white/70",
        invalid && "border-laranja-600",
      )}
    >
      <button
        type="button"
        aria-label="Diminuir"
        className={cn(btn, "border-r-[1.5px]")}
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <Minus className="size-4" />
      </button>
      <input
        id={id}
        aria-describedby={describedBy}
        inputMode="numeric"
        value={value || ""}
        onChange={(e) => onChange(Math.min(MAX_INSTALLMENTS, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))}
        className="tabular w-full min-w-0 bg-transparent text-center font-display text-lg font-bold focus:outline-none"
      />
      <button
        type="button"
        aria-label="Aumentar"
        className={cn(btn, "border-l-[1.5px]")}
        disabled={value >= MAX_INSTALLMENTS}
        onClick={() => onChange(Math.min(MAX_INSTALLMENTS, value + 1))}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function Summary({
  totalCents,
  entryCents,
  remaining,
  plan,
  schedule,
}: {
  totalCents: number;
  entryCents: number;
  remaining: number;
  plan: PaymentPlan;
  schedule: { number: number; amountCents: number; dueDate: string }[];
}) {
  const amounts = new Set(schedule.map((s) => s.amountCents));
  return (
    <Panel tone="dark" title="Resumo" code="calc" bodyClassName="dot-grid" className="lg:sticky lg:top-8">
      <dl className="space-y-2.5 font-mono text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-creme/55">Valor total</dt>
          <dd className="tabular font-semibold">{formatBRL(totalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-creme/55">Entrada</dt>
          <dd className="tabular font-semibold">− {formatBRL(entryCents)}</dd>
        </div>
      </dl>
      <div className="my-4 border-t-[1.5px] border-dashed border-creme/20" />
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-creme/55">Restante</p>
      <p className="tabular mt-1 font-display text-4xl font-[800] tracking-[-0.04em] text-laranja">{formatBRL(remaining)}</p>

      {totalCents > 0 && remaining === 0 && (
        <p className="mt-4 rounded-xl border-[1.5px] border-oliva/40 bg-oliva/15 p-3 text-sm text-oliva-300">
          Quitado na entrada — nenhuma parcela será gerada.
        </p>
      )}

      {schedule.length > 0 && (
        <>
          <p className="mt-5 text-sm text-creme/80">
            <b className="font-semibold text-creme">
              {schedule.length}× {amounts.size === 1 ? formatBRL(schedule[0].amountCents) : "de valores ajustados"}
            </b>{" "}
            · {planLabel[plan].toLowerCase()}
          </p>
          <ol className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {schedule.map((s) => (
              <li
                key={s.number}
                className="tabular flex items-center gap-3 rounded-xl border-[1.5px] border-creme/10 bg-noite-800 px-3 py-2 font-mono text-[13px]"
              >
                <span className="w-12 font-pixel text-[10px] text-creme/45">
                  {s.number}/{schedule.length}
                </span>
                <span className="flex-1 text-creme/70">{formatDate(s.dueDate)}</span>
                <span className="font-semibold">{formatBRL(s.amountCents)}</span>
              </li>
            ))}
          </ol>
          {amounts.size > 1 && (
            <p className="mt-3 text-xs text-creme/45">Centavos distribuídos nas primeiras parcelas para a soma fechar exata.</p>
          )}
        </>
      )}
    </Panel>
  );
}
