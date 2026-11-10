import { HardDrive, KeyRound, LayoutDashboard, LogOut, Palette, Plus, UserPlus, Users } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/brand";
import { useData } from "@/data/DataProvider";
import { cn } from "@/lib/cn";

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean };

const nav: NavItem[] = [
  { to: "/", label: "Painel", icon: <LayoutDashboard />, end: true },
  { to: "/clientes", label: "Clientes", icon: <Users />, end: true },
  { to: "/clientes/novo", label: "Novo cliente", icon: <UserPlus /> },
  ...(import.meta.env.DEV ? [{ to: "/identidade", label: "Identidade", icon: <Palette /> }] : []),
];

/**
 * Estrutura base: "dock" escuro à esquerda no desktop e barra inferior no
 * celular. O conteúdo vive sobre o creme.
 */
export function AppShell() {
  const { email, signOut } = useAuth();
  const { mode, loading, error, reload } = useData();
  const local = mode === "local";

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-noite focus:px-3 focus:py-2 focus:text-creme"
      >
        Pular para o conteúdo
      </a>

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-[232px] flex-col overflow-hidden rounded-[24px] border-[1.5px] border-noite bg-noite text-creme shadow-hard-lg lg:flex">
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex h-full flex-col">
          <NavLink to="/" className="px-5 pb-6 pt-6" aria-label={`${brand.fullName} — painel`}>
            <Logo tone="light" />
          </NavLink>

          <p className="px-5 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-creme/35">Menu</p>
          <nav className="flex flex-col gap-1 px-3" aria-label="Principal">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "group flex h-11 items-center gap-3 rounded-[12px] border-[1.5px] px-3 text-sm font-medium transition-colors",
                    "[&_svg]:size-[18px] [&_svg]:stroke-[1.9]",
                    isActive
                      ? "gloss border-noite bg-gradient-to-b from-[#e07c47] to-laranja-600 text-creme-50 shadow-[0_3px_0_0_#120c0a]"
                      : "border-transparent text-creme/70 hover:border-creme/10 hover:bg-creme/5 hover:text-creme",
                  )
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto p-3">
            <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-creme/10 bg-noite-800/80 p-3">
              <span className="chrome grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-noite text-noite">
                {local ? <HardDrive className="size-4" /> : <span className="font-display text-xs font-bold">{(email ?? "?")[0].toUpperCase()}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{local ? "Modo local" : (email ?? "Minha conta")}</p>
                <p className="font-pixel text-[9px] text-creme/40">
                  {brand.fullName} {brand.version}
                </p>
              </div>
              {!local && (
                <NavLink
                  to="/definir-senha"
                  aria-label="Alterar senha"
                  title="Alterar senha"
                  className="grid size-8 place-items-center rounded-lg text-creme/50 transition-colors hover:bg-creme/10 hover:text-laranja-300"
                >
                  <KeyRound className="size-4" />
                </NavLink>
              )}
              {!local && (
                <button
                  aria-label="Sair"
                  title="Sair"
                  onClick={() => void signOut()}
                  className="grid size-8 place-items-center rounded-lg text-creme/50 transition-colors hover:bg-creme/10 hover:text-laranja-300"
                >
                  <LogOut className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b-[1.5px] border-noite bg-creme/90 px-4 backdrop-blur-md lg:hidden">
        <NavLink to="/" aria-label={`${brand.fullName} — painel`}>
          <Logo size="sm" />
        </NavLink>
        {local ? (
          <span className="font-pixel text-[10px] text-cafe-300">local</span>
        ) : (
          <button
            aria-label="Sair"
            onClick={() => void signOut()}
            className="grid size-9 place-items-center rounded-lg text-cafe transition-colors hover:bg-noite/5"
          >
            <LogOut className="size-4" />
          </button>
        )}
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        {local && (
          <p className="mb-5 flex items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-cafe-300/60 px-3 py-2 text-[13px] text-cafe">
            <HardDrive className="size-4 shrink-0" />
            <span>
              <b className="font-semibold">Modo local:</b> Supabase não configurado — os dados ficam só neste navegador.
            </span>
          </p>
        )}
        {error ? (
          <div className="rounded-panel border-[1.5px] border-noite bg-creme-50 p-6 text-center shadow-hard">
            <p className="font-semibold">{error}</p>
            <button onClick={() => void reload()} className="mt-3 text-sm font-semibold text-laranja-700 underline">
              Tentar novamente
            </button>
          </div>
        ) : loading ? (
          <LoadingScreen />
        ) : (
          <Outlet />
        )}
      </main>

      {/* Dock mobile */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-3 bottom-3 z-30 grid h-16 grid-cols-3 items-center rounded-[22px] border-[1.5px] border-noite bg-noite px-2 text-creme shadow-hard-lg lg:hidden"
      >
        <DockLink to="/" end icon={<LayoutDashboard />} label="Painel" />
        <NavLink
          to="/clientes/novo"
          aria-label="Novo cliente"
          className="gloss mx-auto -mt-7 grid size-14 place-items-center rounded-[18px] border-[1.5px] border-noite bg-gradient-to-b from-[#e8874f] to-laranja-600 text-creme-50 shadow-hard transition-transform active:translate-y-[2px] active:shadow-none"
        >
          <Plus className="size-6" strokeWidth={2.4} />
        </NavLink>
        <DockLink to="/clientes" end icon={<Users />} label="Clientes" />
      </nav>
    </div>
  );
}

function DockLink({ to, end, icon, label }: { to: string; end?: boolean; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "mx-auto flex h-12 w-20 flex-col items-center justify-center gap-1 rounded-[14px] text-[10px] font-semibold",
          "[&_svg]:size-5 [&_svg]:stroke-[1.9]",
          isActive ? "bg-creme/10 text-laranja-300" : "text-creme/60",
        )
      }
    >
      {icon}
      <span className="leading-none">{label}</span>
    </NavLink>
  );
}

function LoadingScreen() {
  return (
    <div className="grid place-items-center py-24" role="status" aria-label="Carregando">
      <div className="flex w-56 gap-[3px] rounded-[10px] border-[1.5px] border-noite bg-noite p-[3px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="h-3 flex-1 rounded-[3px] bg-laranja animate-led-blink"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
      <p className="mt-3 font-pixel text-[10px] text-cafe-300">carregando…</p>
    </div>
  );
}
