import { LayoutDashboard, LogOut, Palette, UserPlus, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

type NavItem = { key: string; label: string; icon: ReactNode };

const nav: NavItem[] = [
  { key: "painel", label: "Painel", icon: <LayoutDashboard /> },
  { key: "clientes", label: "Clientes", icon: <Users /> },
  { key: "novo", label: "Novo cliente", icon: <UserPlus /> },
  { key: "identidade", label: "Identidade", icon: <Palette /> },
];

type AppShellProps = {
  active: string;
  children: ReactNode;
};

/**
 * Estrutura base: "dock" escuro à esquerda no desktop e barra inferior no
 * celular. O conteúdo vive sobre o creme.
 */
export function AppShell({ active, children }: AppShellProps) {
  return (
    <div className="min-h-dvh lg:pl-[248px]">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-[232px] flex-col overflow-hidden rounded-[24px] border-[1.5px] border-noite bg-noite text-creme shadow-hard-lg lg:flex">
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex h-full flex-col">
          <div className="px-5 pb-6 pt-6">
            <Logo tone="light" />
          </div>

          <p className="px-5 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-creme/35">Menu</p>
          <nav className="flex flex-col gap-1 px-3">
            {nav.map((item) => {
              const isActive = item.key === active;
              return (
                <a
                  key={item.key}
                  href="#"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex h-11 items-center gap-3 rounded-[12px] border-[1.5px] px-3 text-sm font-medium transition-colors",
                    "[&_svg]:size-[18px] [&_svg]:stroke-[1.9]",
                    isActive
                      ? "gloss border-noite bg-gradient-to-b from-[#e07c47] to-laranja-600 text-creme-50 shadow-[0_3px_0_0_#120c0a]"
                      : "border-transparent text-creme/70 hover:border-creme/10 hover:bg-creme/5 hover:text-creme",
                  )}
                >
                  {item.icon}
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto p-3">
            <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-creme/10 bg-noite-800/80 p-3">
              <span className="chrome grid size-9 place-items-center rounded-full border-[1.5px] border-noite font-display text-xs font-bold text-noite">
                VA
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Minha conta</p>
                <p className="font-pixel text-[9px] text-creme/40">
                  {brand.fullName} {brand.version}
                </p>
              </div>
              <button
                aria-label="Sair"
                className="grid size-8 place-items-center rounded-lg text-creme/50 transition-colors hover:bg-creme/10 hover:text-laranja-300"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b-[1.5px] border-noite bg-creme/90 px-4 backdrop-blur-md lg:hidden">
        <Logo size="sm" />
        <span className="font-pixel text-[10px] text-cafe-300">{brand.version}</span>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>

      {/* Dock mobile */}
      <nav className="fixed inset-x-3 bottom-3 z-30 flex h-16 items-center justify-around rounded-[22px] border-[1.5px] border-noite bg-noite px-2 text-creme shadow-hard-lg lg:hidden">
        {nav.map((item) => {
          const isActive = item.key === active;
          return (
            <a
              key={item.key}
              href="#"
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-[14px] px-2 text-[10px] font-semibold",
                "[&_svg]:size-5 [&_svg]:stroke-[1.9]",
                isActive ? "gloss bg-laranja text-creme-50" : "text-creme/60",
              )}
            >
              {item.icon}
              <span className="leading-none">{item.label.split(" ")[0]}</span>
            </a>
          );
        })}
      </nav>

    </div>
  );
}
