import { cn } from "@/lib/cn";
import { statusLabel, statusShortLabel, type FinancialStatus } from "@/types/status";

const styles: Record<FinancialStatus, { pill: string; dot: string }> = {
  pago: { pill: "border-success/35 bg-success/10 text-success", dot: "bg-success shadow-[0_0_8px_#3ddc97]" },
  em_dia: { pill: "border-cyan/30 bg-cyan/[0.08] text-cyan-300", dot: "bg-cyan shadow-[0_0_8px_#35ddfb]" },
  proximo: { pill: "border-warning/40 bg-warning/10 text-warning", dot: "bg-warning shadow-[0_0_8px_#f5b544] animate-pulse-dot" },
  atrasado: { pill: "border-danger/40 bg-danger/10 text-[#ff8f9a]", dot: "bg-danger shadow-[0_0_8px_#ff5d6c] animate-pulse-dot" },
};

type StatusBadgeProps = { status: FinancialStatus; short?: boolean; className?: string };

export function StatusBadge({ status, short, className }: StatusBadgeProps) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-semibold",
        s.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {short ? statusShortLabel[status] : statusLabel[status]}
    </span>
  );
}
