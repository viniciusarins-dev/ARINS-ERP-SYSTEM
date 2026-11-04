import { CircleDollarSign } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { useData } from "@/data/DataProvider";
import { RepoError } from "@/data/types";
import { isValidISODate } from "@/domain/dates";
import type { ClientView, InstallmentView } from "@/domain/finance";
import { formatBRL, formatDate } from "@/lib/format";

type OpenPayment = (clientId: string, installmentId: string) => void;

const PaymentContext = createContext<OpenPayment | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<{ clientId: string; installmentId: string } | null>(null);
  const open = useCallback<OpenPayment>((clientId, installmentId) => setTarget({ clientId, installmentId }), []);
  const value = useMemo(() => open, [open]);
  const { views } = useData();
  const view = target ? views.find((v) => v.client.id === target.clientId) : undefined;
  const inst = view?.installments.find((i) => i.id === target?.installmentId);

  return (
    <PaymentContext.Provider value={value}>
      {children}
      <Dialog
        open={Boolean(target && view && inst)}
        onClose={() => setTarget(null)}
        title="Registrar pagamento"
        code="pay"
      >
        {view && inst && <PaymentContent key={inst.id} view={view} inst={inst} onDone={() => setTarget(null)} />}
      </Dialog>
    </PaymentContext.Provider>
  );
}

export function usePayment(): OpenPayment {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePayment fora do PaymentProvider");
  return ctx;
}

function PaymentContent({ view, inst, onDone }: { view: ClientView; inst: InstallmentView; onDone: () => void }) {
  const { today, registerPayment, undoPayment } = useData();
  const toast = useToast();
  const [paidAt, setPaidAt] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guardado na abertura: se a parcela for paga enquanto o diálogo está aberto, não registra de novo.
  const [alreadyPaid] = useState(Boolean(inst.payment));

  const submit = async () => {
    if (!isValidISODate(paidAt) || paidAt > today) {
      setError("Informe uma data válida (até hoje).");
      return;
    }
    setSaving(true);
    try {
      await registerPayment(inst.id, paidAt);
      toast({
        title: "Pagamento registrado",
        description: `${view.client.fullName} · parcela ${inst.number}/${inst.total} · ${formatBRL(inst.amountCents)}`,
        action: {
          label: "Desfazer",
          onClick: () => {
            void undoPayment(inst.id).then(() => toast({ title: "Pagamento desfeito", tone: "warning" }));
          },
        },
      });
      onDone();
    } catch (e) {
      if (e instanceof RepoError && e.code === "already_paid") {
        toast({ title: "Essa parcela já está paga", description: "Nada foi registrado em duplicidade.", tone: "warning" });
        onDone();
      } else {
        setError(e instanceof Error ? e.message : "Não foi possível registrar.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (alreadyPaid) {
    return (
      <p className="text-sm">
        Esta parcela já foi paga em {formatDate(inst.payment!.paidAt)}. Nada a registrar.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center gap-4 rounded-2xl border-[1.5px] border-noite bg-noite p-4 text-creme dot-grid">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-creme/70">
            {view.client.fullName} · {view.project?.name}
          </p>
          <p className="tabular mt-1 font-display text-3xl font-[800] tracking-[-0.04em] text-laranja">
            {formatBRL(inst.amountCents)}
          </p>
          <p className="mt-1 font-mono text-xs text-creme/55">
            Parcela {inst.number}/{inst.total} · vencimento {formatDate(inst.dueDate)}
          </p>
        </div>
        <StatusBadge status={inst.status} short className="bg-creme-50 text-noite" />
      </div>

      <Field label="Data do recebimento" error={error ?? undefined}>
        {(id, d) => (
          <Input
            id={id}
            type="date"
            value={paidAt}
            max={today}
            onChange={(e) => {
              setPaidAt(e.target.value);
              setError(null);
            }}
            aria-describedby={d}
            invalid={Boolean(error)}
            autoFocus
          />
        )}
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="dark" size="lg" loading={saving} icon={<CircleDollarSign />}>
          Confirmar recebimento
        </Button>
      </div>
    </form>
  );
}
