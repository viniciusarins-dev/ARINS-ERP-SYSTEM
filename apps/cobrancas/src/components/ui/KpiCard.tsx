import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatBRLNumber } from "@/lib/format";

import { Sparkline } from "./Sparkline";

export type KpiAccent = "gold" | "cyan" | "danger" | "success" | "neutral";

const accents: Record<KpiAccent, { color: string; icon: string; border: string; glow: string }> = {
  gold: { color: "#d9a441", icon: "border-gold/40 bg-gold/10 text-gold", border: "hover:border-gold/40", glow: "rgba(217,164,65,0.18)" },
  cyan: { color: "#35ddfb", icon: "border-cyan/40 bg-cyan/10 text-cyan", border: "hover:border-cyan/40", glow: "rgba(53,221,251,0.14)" },
  danger: { color: "#ff5d6c", icon: "border-danger/40 bg-danger/10 text-[#ff8f9a]", border: "hover:border-danger/40", glow: "rgba(255,93,108,0.16)" },
  success: { color: "#3ddc97", icon: "border-success/40 bg-success/10 text-success", border: "hover:border-success/40", glow: "rgba(61,220,151,0.14)" },
  neutral: { color: "#9aa3ad", icon: "border-white/15 bg-white/[0.05] text-ice", border: "hover:border-white/20", glow: "transparent" },
};

type KpiCardProps = {
  label: string;
  icon: ReactNode;
  /** centavos quando money=true; inteiro caso contrário */
  value: number;
  money?: boolean;
  caption?: ReactNode;
  accent?: KpiAccent;
  spark?: number[];
  className?: string;
  style?: CSSProperties;
};

export function KpiCard({ label, icon, value, money, caption, accent = "neutral", spark, className, style }: KpiCardProps) {
  const a = accents[accent];
  return (
    <article
      style={style}
      className={cn(
        "glass group relative flex min-h-[132px] animate-rise flex-col justify-between overflow-hidden rounded-2xl p-4 sm:p-5",
        "transition-[border-color,transform] duration-300 hover:-translate-y-0.5",
        a.border,
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full"
        style={{ background: `radial-gradient(circle, ${a.glow}, transparent 70%)` }}
      />
      <div className="relative flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border [&_svg]:size-5", a.icon)}>{icon}</span>
        <p className="pt-0.5 text-[13px] font-medium leading-tight text-mist">{label}</p>
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="tabular flex items-baseline gap-1.5 font-bold leading-none tracking-[-0.02em] text-ice">
            {money && <span className="text-sm font-semibold text-mist">R$</span>}
            <span className="whitespace-nowrap text-[clamp(1.25rem,5.2vw,1.6rem)] lg:text-[clamp(1.2rem,1.7vw,1.6rem)]">
              {money ? formatBRLNumber(value) : value}
            </span>
          </p>
          {caption && <p className="mt-1.5 truncate text-xs text-mist-600">{caption}</p>}
        </div>
        {spark && <Sparkline data={spark} color={a.color} className="h-10 w-24 shrink-0 sm:w-28" />}
      </div>
    </article>
  );
}
