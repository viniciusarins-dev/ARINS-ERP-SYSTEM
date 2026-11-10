import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  /** mantido por compatibilidade; não é exibido */
  code?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  tone?: "light" | "dark";
  bodyClassName?: string;
};

/** Card de vidro escuro. `tone="dark"` usa a borda dourada para destaques. */
export function Panel({ title, icon, actions, tone = "light", className, bodyClassName, children, code: _code, ...props }: PanelProps) {
  void _code;
  return (
    <section
      className={cn("overflow-hidden rounded-2xl", tone === "dark" ? "glass-gold" : "glass", className)}
      {...props}
    >
      {title && (
        <header className="flex min-h-14 items-center gap-3 border-b border-white/[0.06] px-5">
          {icon ? (
            <span className="text-gold [&_svg]:size-[18px]">{icon}</span>
          ) : (
            <span className="size-1.5 rotate-45 bg-gold shadow-[0_0_8px_rgba(217,164,65,0.8)]" />
          )}
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ice">{title}</h2>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
