import { CircleCheck, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/cn";

type ToastProps = {
  tone?: "success" | "warning";
  title: string;
  description?: string;
  className?: string;
};

/** Notificação estilo "pop-up de sistema". (Na Etapa 2 vira um provider global.) */
export function Toast({ tone = "success", title, description, className }: ToastProps) {
  const Icon = tone === "success" ? CircleCheck : TriangleAlert;
  return (
    <div
      role="status"
      className={cn(
        "flex w-full max-w-sm items-start gap-3 rounded-2xl border-[1.5px] border-noite bg-noite p-3.5 pr-5 text-creme shadow-hard-lg animate-rise",
        className,
      )}
    >
      <span
        className={cn(
          "gloss grid size-8 shrink-0 place-items-center rounded-[10px] border-[1.5px] border-noite",
          tone === "success" ? "bg-oliva text-noite" : "bg-laranja text-creme-50",
        )}
      >
        <Icon className="size-4.5" strokeWidth={2.2} />
      </span>
      <div className="pt-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mt-0.5 text-[13px] text-creme/60">{description}</p>}
      </div>
    </div>
  );
}
