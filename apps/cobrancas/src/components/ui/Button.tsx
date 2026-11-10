import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "dark" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
};

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold " +
  "transition-[transform,box-shadow,background-color,border-color,color,filter] duration-200 ease-out " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-40 " +
  "[&_svg]:size-[1.05em] [&_svg]:shrink-0 [&_svg]:stroke-[2.1]";

/**
 * primary   → dourado (ação principal da tela)
 * dark      → ciano (ação operacional: registrar, confirmar)
 * secondary → vidro neutro
 * ghost     → sem fundo
 * danger    → vermelho (ações destrutivas)
 */
const variants: Record<Variant, string> = {
  primary: "btn-gold border border-gold-300/40 hover:brightness-110 hover:shadow-[0_12px_32px_-12px_rgba(217,164,65,0.8)]",
  dark:
    "border border-cyan/40 bg-cyan/10 text-cyan-300 hover:border-cyan hover:bg-cyan hover:text-ink " +
    "hover:shadow-[0_0_24px_-6px_rgba(53,221,251,0.8)]",
  secondary: "border border-white/10 bg-white/[0.04] text-ice hover:border-gold/40 hover:bg-white/[0.07]",
  ghost: "border border-transparent text-mist hover:bg-white/[0.05] hover:text-ice",
  danger: "border border-danger/35 bg-danger/[0.06] text-[#ff9aa4] hover:border-danger hover:bg-danger hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 rounded-lg px-3 text-[13px]",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-12 rounded-xl px-5 text-[15px]",
};

/** Classes do botão, para aplicar em links (<Link>) com a mesma aparência. */
export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, iconRight, loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? (
        <span aria-hidden="true" className="size-[1em] animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </button>
  );
});
