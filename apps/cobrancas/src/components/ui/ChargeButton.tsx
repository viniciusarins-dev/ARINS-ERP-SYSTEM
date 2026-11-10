import { MessageCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ChargeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "md" | "lg";
  overdue?: boolean;
};

/** COBRAR — a ação mais importante do produto, em ciano elétrico. */
export function ChargeButton({ size = "md", overdue, className, children = "Cobrar", ...props }: ChargeButtonProps) {
  return (
    <button
      className={cn(
        "group/charge relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-cyan/45 bg-cyan/[0.08] font-bold uppercase tracking-[0.08em] text-cyan-300",
        "transition-[background-color,color,box-shadow,border-color] duration-200",
        "hover:border-cyan hover:bg-cyan hover:text-ink hover:shadow-[0_0_28px_-6px_rgba(53,221,251,0.85)]",
        "active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
        size === "md" ? "h-9 px-3.5 text-[11.5px]" : "h-12 px-5 text-[13px]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-[left] duration-700 group-hover/charge:left-[120%]"
      />
      <span className="relative">
        <MessageCircle className={size === "md" ? "size-4" : "size-[18px]"} strokeWidth={2.2} />
        {overdue && (
          <span className="absolute -right-1 -top-1 size-2 animate-pulse-dot rounded-full bg-danger shadow-[0_0_8px_#ff5d6c]" />
        )}
      </span>
      {children}
    </button>
  );
}
