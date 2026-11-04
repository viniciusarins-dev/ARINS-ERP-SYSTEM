import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatBRLNumber } from "@/lib/format";

type KpiCardProps = {
  label: string;
  code: string;
  icon: ReactNode;
  /** em centavos quando money=true; inteiro caso contrário */
  value: number;
  money?: boolean;
  caption?: ReactNode;
  tone?: "light" | "dark" | "accent";
  className?: string;
  style?: React.CSSProperties;
};

const tones = {
  light: "bg-creme-50 text-noite",
  dark: "bg-noite text-creme dot-grid",
  accent: "bg-laranja text-noite",
};

export function KpiCard({ label, code, icon, value, money, caption, tone = "light", className, style }: KpiCardProps) {
  const dark = tone === "dark";
  return (
    <article
      style={style}
      className={cn(
        "group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-panel border-[1.5px] border-noite p-4 shadow-hard",
        "transition-transform duration-200 hover:-translate-y-0.5 animate-rise",
        tones[tone],
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-[10px] border-[1.5px] border-noite [&_svg]:size-4 [&_svg]:stroke-[2]",
            dark ? "bg-laranja text-noite" : tone === "accent" ? "bg-noite text-laranja" : "chrome text-noite",
          )}
        >
          {icon}
        </span>
        <span className={cn("font-pixel text-[10px]", dark ? "text-creme/40" : "text-noite/45")}>{code}</span>
      </div>

      <div>
        <p
          className={cn(
            "mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]",
            dark ? "text-creme/60" : tone === "accent" ? "text-noite/75" : "text-cafe-300",
          )}
        >
          {label}
        </p>
        <p className="tabular flex items-baseline gap-1.5 font-display font-[700] leading-none tracking-[-0.03em]">
          {money && <span className="font-mono text-xs font-semibold opacity-60 sm:text-sm">R$</span>}
          <span className="whitespace-nowrap text-[clamp(1.15rem,5.4vw,1.75rem)] lg:text-[clamp(1.25rem,1.9vw,1.75rem)]">{money ? formatBRLNumber(value) : value}</span>
        </p>
        {caption && (
          <p className={cn("mt-2 text-xs", dark ? "text-creme/55" : tone === "accent" ? "text-noite/70" : "text-cafe-300")}>
            {caption}
          </p>
        )}
      </div>
    </article>
  );
}
