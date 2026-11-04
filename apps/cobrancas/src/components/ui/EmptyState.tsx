import type { ReactNode } from "react";

import { Sparkle } from "@/components/brand/Sparkle";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

/** Estado vazio com "tela" de monitor antigo — convida à ação, sem infantilizar. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="relative mb-5">
        <div className="grid size-20 place-items-center rounded-[22px] border-[1.5px] border-noite bg-noite text-laranja shadow-hard dot-grid [&_svg]:size-8 [&_svg]:stroke-[1.6]">
          {icon}
        </div>
        <Sparkle className="absolute -right-3 -top-2 size-5 text-laranja" />
        <Sparkle className="absolute -bottom-1 -left-3 size-3 text-oliva-700" />
      </div>
      <h3 className="font-display text-lg font-bold tracking-[-0.02em]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-cafe-300">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
