import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="relative mb-5 grid size-16 place-items-center rounded-2xl border border-gold/30 bg-gold/[0.06] text-gold shadow-[0_0_40px_-12px_rgba(217,164,65,0.6)] [&_svg]:size-7 [&_svg]:stroke-[1.6]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-mist">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
