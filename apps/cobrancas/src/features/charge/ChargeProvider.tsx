import { CircleAlert, ExternalLink, Pencil } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { buttonClass } from "@/components/ui/Button";
import { ChargeButton } from "@/components/ui/ChargeButton";
import { Dialog } from "@/components/ui/Dialog";
import { inputBase } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { useData } from "@/data/DataProvider";
import type { ClientView, InstallmentView } from "@/domain/finance";
import { buildChargeMessage } from "@/domain/message";
import { formatPhone, validatePhone, whatsappLink } from "@/domain/phone";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/format";

type OpenCharge = (clientId: string, installmentId?: string) => void;

const ChargeContext = createContext<OpenCharge | null>(null);

export function ChargeProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<{ clientId: string; installmentId?: string } | null>(null);
  const open = useCallback<OpenCharge>((clientId, installmentId) => setTarget({ clientId, installmentId }), []);
  const value = useMemo(() => open, [open]);

  return (
    <ChargeContext.Provider value={value}>
      {children}
      <ChargeDialog target={target} onClose={() => setTarget(null)} />
    </ChargeContext.Provider>
  );
}

export function useCharge(): OpenCharge {
  const ctx = useContext(ChargeContext);
  if (!ctx) throw new Error("useCharge fora do ChargeProvider");
  return ctx;
}

function ChargeDialog({
  target,
  onClose,
}: {
  target: { clientId: string; installmentId?: string } | null;
  onClose: () => void;
}) {
  const { views } = useData();
  const view = target ? views.find((v) => v.client.id === target.clientId) : undefined;

  return (
    <Dialog open={Boolean(target && view)} onClose={onClose} title="Cobrar pelo WhatsApp" code="wa.me">
      {view && <ChargeContent key={view.client.id} view={view} initialId={target?.installmentId} onDone={onClose} />}
    </Dialog>
  );
}

function ChargeContent({ view, initialId, onDone }: { view: ClientView; initialId?: string; onDone: () => void }) {
  const { today } = useData();
  const toast = useToast();
  const open = view.installments.filter((i) => !i.payment);
  const [selectedId, setSelectedId] = useState(
    open.find((i) => i.id === initialId)?.id ?? view.next?.id ?? open[0]?.id,
  );
  const selected = open.find((i) => i.id === selectedId);

  const generate = useCallback(
    (inst: InstallmentView) =>
      buildChargeMessage({
        clientName: view.client.fullName,
        projectName: view.project?.name ?? "",
        amountCents: inst.amountCents,
        number: inst.number,
        total: inst.total,
        dueDate: inst.dueDate,
        status: inst.status,
        today,
      }),
    [view, today],
  );

  const [message, setMessage] = useState(() => (selected ? generate(selected) : ""));
  const phone = validatePhone(view.client.whatsapp);

  if (!selected) {
    return <p className="text-sm text-cafe">Nenhuma parcela em aberto para este cliente.</p>;
  }

  const choose = (inst: InstallmentView) => {
    setSelectedId(inst.id);
    setMessage(generate(inst));
  };

  const send = () => {
    if (!phone.ok) return;
    window.open(whatsappLink(phone.national, message.trim()), "_blank", "noopener,noreferrer");
    toast({ title: "WhatsApp aberto", description: "Revise a mensagem e envie por lá." });
    onDone();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{view.client.fullName}</p>
          <p className="font-mono text-xs text-cafe-300">
            {phone.ok ? `+55 ${formatPhone(phone.national)}` : "WhatsApp inválido"} · {view.project?.name}
          </p>
        </div>
        <StatusBadge status={selected.status} short />
      </div>

      {open.length > 1 && (
        <fieldset>
          <legend className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-cafe">
            Parcela a cobrar
          </legend>
          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-1">
            {open.map((inst) => {
              const active = inst.id === selectedId;
              return (
                <label
                  key={inst.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 transition-colors",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laranja",
                    active ? "border-noite bg-creme-100 shadow-hard-sm" : "border-noite/15 hover:border-noite/40",
                  )}
                >
                  <input
                    type="radio"
                    name="installment"
                    className="sr-only"
                    checked={active}
                    onChange={() => choose(inst)}
                  />
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] border-noite",
                      active && "bg-laranja",
                    )}
                  >
                    {active && <span className="size-1.5 rounded-full bg-creme-50" />}
                  </span>
                  <span className="tabular flex-1 font-mono text-[13px]">
                    <b className="font-semibold">
                      {inst.number}/{inst.total}
                    </b>{" "}
                    · {formatBRL(inst.amountCents)} · {formatDate(inst.dueDate)}
                  </span>
                  <StatusBadge status={inst.status} short className="hidden sm:inline-flex" />
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div>
        <label
          htmlFor="charge-message"
          className="mb-2 flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-cafe"
        >
          Mensagem
          <span className="normal-case tracking-normal text-cafe-300">pode editar antes de enviar</span>
        </label>
        <textarea
          id="charge-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
          className={cn(inputBase, "h-auto resize-y py-3 text-[14px] leading-relaxed")}
        />
      </div>

      {!phone.ok && (
        <div className="flex items-start gap-3 rounded-xl border-[1.5px] border-laranja/50 bg-laranja/10 p-3 text-sm text-laranja-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{phone.error}</p>
            <Link to={`/clientes/${view.client.id}/editar`} onClick={onDone} className="mt-1 inline-flex items-center gap-1 underline">
              <Pencil className="size-3.5" /> Corrigir número
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onDone} className={buttonClass("ghost", "md")}>
          Cancelar
        </button>
        <ChargeButton
          size="lg"
          onClick={send}
          disabled={!phone.ok || !message.trim()}
          overdue={selected.status === "atrasado"}
          className="justify-center"
        >
          Abrir WhatsApp <ExternalLink className="size-4" />
        </ChargeButton>
      </div>
    </div>
  );
}
