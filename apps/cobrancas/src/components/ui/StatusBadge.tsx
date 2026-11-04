import { cn } from "@/lib/cn";
import { statusLabel, statusShortLabel, type FinancialStatus } from "@/types/status";

const styles: Record<FinancialStatus, { pill: string; led: string }> = {
  pago: {
    pill: "bg-oliva/30 text-oliva-700 border-oliva-700/40",
    led: "bg-[radial-gradient(circle_at_35%_30%,#e9f1d2,#a6b87a_55%,#5d6b35)]",
  },
  em_dia: {
    pill: "bg-creme-300/70 text-cafe border-cafe/30",
    led: "bg-[radial-gradient(circle_at_35%_30%,#d8c3b6,#8a6a57_55%,#493126)]",
  },
  proximo: {
    pill: "bg-laranja/15 text-laranja-700 border-laranja/50",
    led: "bg-[radial-gradient(circle_at_35%_30%,#ffd9c2,#d66b35_55%,#96421e)] animate-led-pulse",
  },
  atrasado: {
    pill: "bg-noite text-creme border-noite",
    led: "bg-[radial-gradient(circle_at_35%_30%,#ffd9c2,#d66b35_55%,#96421e)] animate-led-blink shadow-[0_0_8px_#d66b35]",
  },
};

type StatusBadgeProps = {
  status: FinancialStatus;
  short?: boolean;
  className?: string;
};

/** Pílula com "LED" esférico — cada situação tem cor e comportamento próprios. */
export function StatusBadge({ status, short, className }: StatusBadgeProps) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-chip border pl-1.5 pr-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em]",
        s.pill,
        className,
      )}
    >
      <span className={cn("size-2.5 rounded-full ring-1 ring-noite/30", s.led)} />
      {short ? statusShortLabel[status] : statusLabel[status]}
    </span>
  );
}
