import { CircleCheck, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type ToastInput = {
  title: string;
  description?: string;
  tone?: "success" | "warning";
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.action ? 7000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:items-end"
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function ToastCard({ item, onDismiss }: { item: ToastInput; onDismiss?: () => void }) {
  const tone = item.tone ?? "success";
  const Icon = tone === "success" ? CircleCheck : TriangleAlert;
  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-2xl border-[1.5px] border-noite bg-noite p-3.5 text-creme shadow-hard-lg"
    >
      <span
        className={cn(
          "gloss grid size-8 shrink-0 place-items-center rounded-[10px] border-[1.5px] border-noite",
          tone === "success" ? "bg-oliva text-noite" : "bg-laranja text-creme-50",
        )}
      >
        <Icon className="size-4.5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold">{item.title}</p>
        {item.description && <p className="mt-0.5 text-[13px] text-creme/60">{item.description}</p>}
      </div>
      {item.action && (
        <button
          onClick={() => {
            item.action!.onClick();
            onDismiss?.();
          }}
          className="mt-0.5 shrink-0 rounded-lg border border-creme/20 px-2.5 py-1 text-xs font-semibold text-laranja-300 transition-colors hover:bg-creme/10"
        >
          {item.action.label}
        </button>
      )}
      {onDismiss && (
        <button
          aria-label="Fechar"
          onClick={onDismiss}
          className="-mr-1 grid size-7 shrink-0 place-items-center rounded-lg text-creme/40 transition-colors hover:bg-creme/10 hover:text-creme"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fora do ToastProvider");
  return ctx;
}
