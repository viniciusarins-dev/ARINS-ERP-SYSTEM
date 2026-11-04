import { ArrowLeft } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { brand } from "@/config/brand";

type PageHeaderProps = {
  title: string;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
};

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${brand.fullName}`;
  }, [title]);
}

export function PageHeader({ title, eyebrow, description, actions, back }: PageHeaderProps) {
  usePageTitle(title);
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-cafe-300 transition-colors hover:text-laranja-700"
          >
            <ArrowLeft className="size-3.5" /> {back.label}
          </Link>
        )}
        {eyebrow && (
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cafe-300">{eyebrow}</p>
        )}
        <h1 className="break-words font-display text-[30px] font-[800] leading-[1.05] tracking-[-0.045em] sm:text-[40px]">
          {title}
        </h1>
        {description && <div className="mt-2 text-sm text-cafe-300">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
