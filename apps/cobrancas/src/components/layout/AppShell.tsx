import { Bell, Calculator, HardDrive, KeyRound, LayoutDashboard, LogOut, Plus, Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { ArmagMark } from "@/components/brand/ArmagMark";
import { Backdrop } from "@/components/armag/AuthParts";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/data/DataProvider";
import { upcomingCharges } from "@/domain/finance";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/format";

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean };

const nav: NavItem[] = [
  { to: "/", label: "Painel", icon: <LayoutDashboard />, end: true },
  { to: "/clientes", label: "Clientes", icon: <Users />, end: true },
  { to: "/clientes/novo", label: "Novo cliente", icon: <UserPlus /> },
  { to: "/orcamentos", label: "Orçamentos", icon: <Calculator /> },
];

/** Remove acentos para busca: "joao" encontra "João". */
function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Estrutura principal ARMAG: sidebar de vidro (desktop), barra superior com
 * busca global e notificações, navegação inferior no celular.
 */
export function AppShell() {
  const { mode, loading, error, reload } = useData();
  const local = mode === "local";

  return (
    <div className="relative min-h-dvh lg:pl-[272px]">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <Backdrop />
      </div>

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-ink"
      >
        Pular para o conteúdo
      </a>

      <Sidebar />

      <div className="relative">
        <Topbar />
        <main id="conteudo" className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
          {local && (
            <p className="mb-5 flex items-center gap-2.5 rounded-xl border border-dashed border-white/15 px-3 py-2 text-[13px] text-mist">
              <HardDrive className="size-4 shrink-0" />
              <span>
                <b className="font-semibold text-ice">Modo local:</b> Supabase não configurado — os dados ficam só neste navegador.
              </span>
            </p>
          )}
          {error ? (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="font-semibold">{error}</p>
              <button onClick={() => void reload()} className="mt-3 text-sm font-semibold text-cyan underline">
                Tentar novamente
              </button>
            </div>
          ) : loading ? (
            <LoadingScreen />
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

function Sidebar() {
  const { email, displayName, signOut } = useAuth();
  const { mode } = useData();
  const local = mode === "local";

  return (
    <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-[256px] flex-col overflow-hidden rounded-3xl lg:flex">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-16 right-0 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent"
      />
      <Link to="/" className="flex justify-center px-5 pb-7 pt-7" aria-label="ARMAG Cobranças — painel">
        <ArmagMark />
      </Link>

      <nav className="flex flex-col gap-1 px-3" aria-label="Principal">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group relative flex h-11 items-center gap-3 rounded-xl border px-3.5 text-sm font-medium transition-[background-color,border-color,color] duration-200",
                "[&_svg]:size-[18px] [&_svg]:stroke-[1.9]",
                isActive
                  ? "border-gold/35 bg-gradient-to-r from-gold/[0.16] to-gold/[0.03] text-gold-200 shadow-[0_0_24px_-10px_rgba(217,164,65,0.9)]"
                  : "border-transparent text-mist hover:bg-white/[0.04] hover:text-ice",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold shadow-[0_0_12px_#d9a441]" />
                )}
                <span className={isActive ? "text-gold" : ""}>{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 p-3">
        <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.08] to-transparent p-4 text-center">
          <p className="font-brand text-sm font-bold tracking-[0.14em] text-gold-metal">ARMAG</p>
          <p className="mt-1 text-xs leading-relaxed text-mist">Gestão inteligente. Resultados reais.</p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 text-sm font-bold text-gold-200">
            {local ? <HardDrive className="size-4" /> : (displayName ?? email ?? "?")[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold capitalize">{local ? "Modo local" : (displayName ?? "Minha conta")}</p>
            <p className="flex items-center gap-1.5 truncate text-[11px] text-mist-600">
              <span className="size-1.5 shrink-0 rounded-full bg-success shadow-[0_0_6px_#3ddc97]" />
              {local ? "neste navegador" : email}
            </p>
          </div>
          {!local && (
            <div className="flex">
              <NavLink
                to="/definir-senha"
                aria-label="Alterar senha"
                title="Alterar senha"
                className="grid size-8 place-items-center rounded-lg text-mist-600 transition-colors hover:bg-white/[0.06] hover:text-cyan"
              >
                <KeyRound className="size-4" />
              </NavLink>
              <button
                aria-label="Sair"
                title="Sair"
                onClick={() => void signOut()}
                className="grid size-8 place-items-center rounded-lg text-mist-600 transition-colors hover:bg-white/[0.06] hover:text-danger"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  const { mode } = useData();
  const { signOut } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="lg:hidden" aria-label="ARMAG Cobranças — painel">
          <ArmagMark compact />
        </Link>
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-1.5">
          <Notifications />
          {mode !== "local" && (
            <button
              aria-label="Sair"
              onClick={() => void signOut()}
              className="grid size-10 place-items-center rounded-xl text-mist transition-colors hover:bg-white/[0.05] hover:text-ice lg:hidden"
            >
              <LogOut className="size-[18px]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/** Fecha um popover ao clicar fora ou apertar Esc. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function GlobalSearch() {
  const { views } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useDismiss(open, () => setOpen(false));

  // atalho "/" foca a busca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return views
      .filter((v) => normalize(v.client.fullName).includes(q) || normalize(v.project?.name ?? "").includes(q))
      .slice(0, 6);
  }, [views, query]);

  const go = (id: string) => {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/clientes/${id}`);
  };

  return (
    <div ref={ref} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mist-600" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) go(results[0].client.id);
        }}
        placeholder="Buscar clientes e projetos…"
        aria-label="Buscar clientes e projetos"
        className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] pl-11 pr-12 text-sm text-ice placeholder:text-mist-600 transition-[border-color,box-shadow] focus:border-cyan/60 focus:outline-none focus:shadow-[0_0_0_4px_rgba(53,221,251,0.1)]"
      />
      <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-white/10 px-1.5 text-[11px] text-mist-600">
        /
      </kbd>
      {open && query.trim() && (
        <div className="glass-gold absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-mist">Nenhum cliente encontrado.</p>
          ) : (
            results.map((v) => (
              <button
                key={v.client.id}
                onClick={() => go(v.client.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{v.client.fullName}</span>
                  <span className="block truncate text-xs text-mist-600">{v.project?.name}</span>
                </span>
                <StatusBadge status={v.status} short />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const { views } = useData();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  // Alertas reais: parcelas atrasadas ou vencendo nos próximos dias.
  const alerts = useMemo(
    () =>
      upcomingCharges(views, 100).filter(
        (c) => c.installment.status === "atrasado" || c.installment.status === "proximo",
      ),
    [views],
  );
  const overdue = alerts.filter((a) => a.installment.status === "atrasado").length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações${alerts.length ? ` (${alerts.length})` : ""}`}
        aria-expanded={open}
        className={cn(
          "relative grid size-10 place-items-center rounded-xl border transition-colors",
          open ? "border-gold/40 bg-gold/10 text-gold" : "border-white/10 bg-white/[0.04] text-mist hover:text-ice",
        )}
      >
        <Bell className="size-[18px]" />
        {alerts.length > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-ink",
              overdue ? "bg-danger shadow-[0_0_10px_#ff5d6c]" : "bg-warning",
            )}
          >
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-gold absolute right-0 top-[calc(100%+8px)] z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <p className="text-sm font-semibold">Notificações</p>
            <button
              aria-label="Fechar notificações"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-lg text-mist hover:bg-white/[0.06]"
            >
              <X className="size-4" />
            </button>
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-mist">Tudo em dia. Nenhuma parcela atrasada ou vencendo.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {alerts.slice(0, 12).map(({ view, installment }) => (
                <li key={installment.id}>
                  <Link
                    to={`/clientes/${view.client.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        installment.status === "atrasado" ? "bg-danger shadow-[0_0_8px_#ff5d6c]" : "bg-warning",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{view.client.fullName}</span>
                      <span className="block text-xs text-mist">
                        Parcela {installment.number}/{installment.total} · {formatBRL(installment.amountCents)} ·{" "}
                        {installment.status === "atrasado" ? "venceu" : "vence"} {formatDate(installment.dueDate)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MobileNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-3 bottom-3 z-30 grid h-16 grid-cols-4 items-center rounded-2xl border border-white/10 bg-ink-900/95 px-2 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:hidden"
    >
      <DockLink to="/" end icon={<LayoutDashboard />} label="Painel" />
      <DockLink to="/clientes" end icon={<Users />} label="Clientes" />
      <NavLink
        to="/clientes/novo"
        aria-label="Novo cliente"
        className="btn-gold mx-auto -mt-8 grid size-14 place-items-center rounded-2xl border border-gold-300/50 transition-transform active:translate-y-px"
      >
        <Plus className="size-6" strokeWidth={2.4} />
      </NavLink>
      <DockLink to="/orcamentos" icon={<Calculator />} label="Orçamentos" />
    </nav>
  );
}

function DockLink({ to, end, icon, label }: { to: string; end?: boolean; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "mx-auto flex h-12 w-20 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold",
          "[&_svg]:size-5 [&_svg]:stroke-[1.9]",
          isActive ? "bg-gold/10 text-gold" : "text-mist",
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
    <div className="grid place-items-center py-28" role="status" aria-label="Carregando">
      <img src="/brand/escudo.png" alt="" className="size-16 animate-pulse-dot rounded-2xl" />
      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-mist-600">Carregando</p>
    </div>
  );
}
