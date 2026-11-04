import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Rótulo da "barra de título" estilo janela dos anos 2000. */
  title?: string;
  /** Código curto à direita da barra (ex.: "01", "cli/04"). */
  code?: string;
  actions?: ReactNode;
  tone?: "light" | "dark";
  bodyClassName?: string;
};

/**
 * Painel com barra de título — a "janela" do sistema. Sem botões falsos de
 * fechar/minimizar: a barra carrega só informação útil.
 */
export function Panel({ title, code, actions, tone = "light", className, bodyClassName, children, ...props }: PanelProps) {
  const dark = tone === "dark";
  return (
    <section
      className={cn(
        "overflow-hidden rounded-panel border-[1.5px] border-noite shadow-hard",
        dark ? "bg-noite text-creme" : "bg-creme-50",
        className,
      )}
      {...props}
    >
      {title && (
        <header
          className={cn(
            "flex h-10 items-center gap-3 border-b-[1.5px] border-noite px-4",
            dark ? "bg-noite-800 scanlines" : "bg-gradient-to-b from-creme-100 to-creme-300/60",
          )}
        >
          <span className={cn("size-1.5 rotate-45", dark ? "bg-laranja" : "bg-noite")} />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">{title}</h2>
          <span className={cn("h-px flex-1", dark ? "bg-creme/15" : "bg-noite/15")} />
          {code && (
            <span className={cn("font-pixel text-[10px]", dark ? "text-creme/45" : "text-cafe-300")}>{code}</span>
          )}
          {actions}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
