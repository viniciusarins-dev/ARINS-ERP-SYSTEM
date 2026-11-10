import { ArrowLeft } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { brand } from "@/config/brand";

type PageHeaderProps = {
  /** título da página (também usado na aba do navegador) */
  title: string;
  /** substitui o título visível, ex.: saudação com destaque dourado */
  heading?: ReactNode;
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

export function PageHeader({ title, heading, eyebrow, description, actions, back }: PageHeaderProps) {
  usePageTitle(title);
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-mist transition-colors hover:text-gold"
          >
            <ArrowLeft className="size-4" /> {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="break-words text-[28px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[36px]">{heading ?? title}</h1>
        {description && <div className="mt-2 text-sm text-mist">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
