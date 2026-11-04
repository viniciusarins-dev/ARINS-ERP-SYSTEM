import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  code?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Janela modal baseada no <dialog> nativo (foco preso, Esc fecha).
 * No celular abre como "bottom sheet".
 */
export function Dialog({ open, onClose, title, code, children, footer, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-full max-w-lg overflow-visible bg-transparent p-3 text-noite backdrop:bg-noite/60 backdrop:backdrop-blur-[2px]",
        "max-sm:mb-0 max-sm:max-w-none max-sm:p-2 open:animate-rise",
        className,
      )}
    >
      {open && (
        <div className="overflow-hidden rounded-panel border-[1.5px] border-noite bg-creme-50 shadow-hard-lg">
          <header className="flex h-11 items-center gap-3 border-b-[1.5px] border-noite bg-gradient-to-b from-creme-100 to-creme-300/60 pl-4 pr-1.5">
            <span className="size-1.5 rotate-45 bg-noite" />
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">{title}</h2>
            <span className="h-px flex-1 bg-noite/15" />
            {code && <span className="font-pixel text-[10px] text-cafe-300">{code}</span>}
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-cafe transition-colors hover:bg-noite/10"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="max-h-[70dvh] overflow-y-auto p-4 sm:p-5">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t-[1.5px] border-noite/10 bg-creme-100 px-4 py-3 sm:px-5">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
