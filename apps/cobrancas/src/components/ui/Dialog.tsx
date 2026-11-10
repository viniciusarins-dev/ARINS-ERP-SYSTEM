import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** mantido por compatibilidade; não é exibido */
  code?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Janela modal baseada no <dialog> nativo (foco preso, Esc fecha).
 * No celular abre como "bottom sheet".
 */
export function Dialog({ open, onClose, title, children, footer, className }: DialogProps) {
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
        "m-auto w-full max-w-lg overflow-visible bg-transparent p-3 text-ice backdrop:bg-black/70 backdrop:backdrop-blur-sm",
        "max-sm:mb-0 max-sm:max-w-none max-sm:p-2 open:animate-rise",
        className,
      )}
    >
      {open && (
        <div className="glass-gold overflow-hidden rounded-2xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent"
          />
          <header className="flex h-14 items-center gap-3 border-b border-white/[0.06] pl-5 pr-2">
            <span className="size-1.5 rotate-45 bg-gold shadow-[0_0_8px_rgba(217,164,65,0.8)]" />
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="ml-auto grid size-9 place-items-center rounded-lg text-mist transition-colors hover:bg-white/[0.06] hover:text-ice"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="max-h-[72dvh] overflow-y-auto p-5">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
