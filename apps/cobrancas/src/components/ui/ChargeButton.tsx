import { MessageCircleMore } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ChargeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "md" | "lg";
  overdue?: boolean;
};

/**
 * O botão mais importante do produto. Pílula "jelly" laranja, tipografia
 * display e um reflexo que atravessa no hover.
 */
export function ChargeButton({ size = "md", overdue, className, children = "Cobrar", ...props }: ChargeButtonProps) {
  return (
    <button
      className={cn(
        "gloss sheen group/charge relative inline-flex items-center gap-2 rounded-chip border-[1.5px] border-noite",
        "bg-gradient-to-b from-[#e8874f] via-laranja to-laranja-600 font-display font-bold uppercase tracking-[0.06em] text-creme-50",
        "shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[0_5px_0_0_var(--color-noite)]",
        "active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-45",
        size === "md" ? "h-10 pl-3 pr-4 text-[12px]" : "h-13 pl-4 pr-6 text-sm",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "relative grid place-items-center rounded-full border border-noite/40 bg-noite text-laranja-300",
          size === "md" ? "size-6" : "size-8",
        )}
      >
        <MessageCircleMore className={size === "md" ? "size-3.5" : "size-4.5"} strokeWidth={2.2} />
        {overdue && (
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-noite bg-creme animate-led-blink" />
        )}
      </span>
      {children}
    </button>
  );
}
