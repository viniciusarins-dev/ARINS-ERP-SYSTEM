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

export function ClientAvatar({ name, status, className }: { name: string; status: FinancialStatus; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-[12px] border-[1.5px] border-noite font-display text-xs font-bold",
        status === "atrasado" ? "bg-noite text-laranja" : status === "pago" ? "bg-oliva text-noite" : "chrome text-noite",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

type ClientRowProps = ClientRowData & {
  href?: string;
  onCharge?: () => void;
};

/** Linha densa no desktop; vira cartão no celular. */
export function ClientRow({ name, project, remainingCents, nextDue, status, href, onCharge }: ClientRowProps) {
  const title = href ? (
    <Link to={href} className="truncate font-semibold after:absolute after:inset-0 hover:text-laranja-700">
      {name}
    </Link>
  ) : (
    <p className="truncate font-semibold">{name}</p>
  );

  return (
    <li className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 border-b-[1.5px] border-noite/10 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-creme-100 md:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_8.5rem_8.5rem] md:gap-x-5">
      <ClientAvatar name={name} status={status} />
      <div className="flex min-w-0 flex-col">
        {title}
        <p className="truncate text-[13px] text-cafe-300">{project}</p>
      </div>
      <div className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto">
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-cafe-300 md:block">Restante</p>
        <p className="tabular text-right font-mono text-sm font-semibold md:text-left">{formatBRL(remainingCents)}</p>
      </div>
      <div className="col-span-2 col-start-2 flex items-center gap-3 md:col-span-1 md:col-start-auto md:block">
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-cafe-300 md:block">Próx. vencimento</p>
        <p className="tabular font-mono text-sm">{nextDue ? formatDate(nextDue) : "—"}</p>
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
