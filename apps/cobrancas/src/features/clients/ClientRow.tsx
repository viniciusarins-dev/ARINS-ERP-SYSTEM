import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonClass } from "@/components/ui/Button";
import { ChargeButton } from "@/components/ui/ChargeButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/format";
import type { FinancialStatus } from "@/types/status";

export type ClientRowData = {
  id: string;
  name: string;
  project: string;
  remainingCents: number;
  nextDue: string | null;
  status: FinancialStatus;
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

const avatarTone: Record<FinancialStatus, string> = {
  atrasado: "border-danger/40 bg-danger/10 text-[#ff8f9a]",
  proximo: "border-warning/40 bg-warning/10 text-warning",
  em_dia: "border-gold/35 bg-gold/10 text-gold-200",
  pago: "border-success/35 bg-success/10 text-success",
};

export function ClientAvatar({ name, status, className }: { name: string; status: FinancialStatus; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-10 shrink-0 place-items-center rounded-xl border text-xs font-bold", avatarTone[status], className)}
    >
      {initials(name)}
    </span>
  );
}

type ClientRowProps = ClientRowData & { href?: string; onCharge?: () => void };

/** Linha de tabela no desktop; vira cartão no celular. */
export function ClientRow({ name, project, remainingCents, nextDue, status, href, onCharge }: ClientRowProps) {
  const title = href ? (
    <Link to={href} className="truncate font-semibold text-ice after:absolute after:inset-0 hover:text-gold-200">
      {name}
    </Link>
  ) : (
    <p className="truncate font-semibold">{name}</p>
  );

  return (
    <li className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 border-b border-white/[0.05] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.025] md:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_8.5rem_8.5rem] md:gap-x-5 md:px-5">
      <ClientAvatar name={name} status={status} />
      <div className="flex min-w-0 flex-col">
        {title}
        <p className="truncate text-[13px] text-mist-600">{project}</p>
      </div>
      <div className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto">
        <p className="eyebrow hidden md:block">Restante</p>
        <p className="tabular text-right text-sm font-semibold md:mt-0.5 md:text-left">{formatBRL(remainingCents)}</p>
      </div>
      <div className="col-span-2 col-start-2 flex items-center gap-3 md:col-span-1 md:col-start-auto md:block">
        <p className="eyebrow hidden md:block">Próx. vencimento</p>
        <p className="tabular text-sm text-mist md:mt-0.5">{nextDue ? formatDate(nextDue) : "—"}</p>
        <StatusBadge status={status} short className="md:hidden" />
      </div>
      <StatusBadge status={status} short className="hidden justify-self-start md:inline-flex" />
      <div className="relative z-10 col-span-3 flex justify-end md:col-span-1">
        {status === "pago" || !onCharge ? (
          href ? (
            <Link to={href} className={buttonClass("ghost", "sm")}>
              Detalhes <ArrowRight />
            </Link>
          ) : null
        ) : (
          <ChargeButton
            overdue={status === "atrasado"}
            onClick={onCharge}
            className="w-full justify-center md:w-auto"
            aria-label={`Cobrar ${name}`}
          />
        )}
      </div>
    </li>
  );
}
