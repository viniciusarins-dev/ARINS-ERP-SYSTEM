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
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap " +
  "border-[1.5px] border-noite font-sans font-semibold " +
  "transition-[transform,box-shadow,background-color,color] duration-150 ease-out " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "[&_svg]:size-[1.05em] [&_svg]:shrink-0 [&_svg]:stroke-[2.1]";

/** Botões "físicos": sombra dura embaixo que some ao pressionar. */
const pressable =
  "shadow-hard-sm hover:-translate-y-px hover:shadow-[0_3px_0_0_var(--color-noite)] " +
  "active:translate-y-[2px] active:shadow-none";

const variants: Record<Variant, string> = {
  primary:
    `gloss ${pressable} text-creme-50 bg-gradient-to-b from-[#e07c47] to-laranja-600 ` +
    "hover:from-[#ea8a55]",
  secondary: `${pressable} bg-creme-50 text-noite hover:bg-white`,
  dark: `gloss ${pressable} bg-gradient-to-b from-noite-700 to-noite text-creme hover:to-noite-800`,
  ghost:
    "border-transparent bg-transparent text-cafe hover:border-noite/15 hover:bg-noite/5 active:bg-noite/10",
  danger: `${pressable} bg-creme-50 text-laranja-700 hover:bg-laranja-600 hover:text-creme-50`,
};

const sizes: Record<Size, string> = {
  sm: "h-8 rounded-[10px] px-3 text-[13px]",
  md: "h-10 rounded-control px-4 text-sm",
  lg: "h-12 rounded-[14px] px-5 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, iconRight, loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-[1em] animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}
