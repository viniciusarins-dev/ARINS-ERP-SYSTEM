import type { ReactNode } from "react";
import { useId } from "react";

/** Peças visuais das telas de acesso ARMAG (login, troca de senha). */

export const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-11 pr-4 text-[15px] text-ice placeholder:text-mist-600 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-white/20 focus:border-cyan/70 focus:bg-white/[0.05] focus:outline-none focus:shadow-[0_0_0_4px_rgba(53,221,251,0.12),0_0_24px_-6px_rgba(53,221,251,0.5)] " +
  "aria-[invalid=true]:border-danger/60";

export function DarkField({
  label,
  icon,
  trailing,
  children,
}: {
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-mist">
        {label}
      </label>
      <div className="group/field relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-mist-600 transition-colors group-focus-within/field:text-cyan [&_svg]:size-[18px]">
          {icon}
        </span>
        {children(id)}
        {trailing && <span className="absolute inset-y-0 right-1.5 grid place-items-center">{trailing}</span>}
      </div>
    </div>
  );
}

export function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-ice/85">
      <span className="grid size-9 place-items-center rounded-xl border border-gold/25 bg-gold/[0.06] text-gold [&_svg]:size-[18px]">
        {icon}
      </span>
      {text}
    </li>
  );
}

/** Fundo: brilhos dourado/ciano, feixes diagonais e grade sutil. */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -right-40 -top-40 size-[640px] rounded-full bg-[radial-gradient(circle,rgba(217,164,65,0.18),transparent_62%)]" />
      <div className="absolute -bottom-56 -left-40 size-[620px] rounded-full bg-[radial-gradient(circle,rgba(53,221,251,0.12),transparent_62%)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* feixes de luz diagonais (só em telas grandes, para não cruzar o formulário) */}
      <div className="absolute -right-24 top-0 hidden h-[140%] lg:block w-px rotate-[32deg] origin-top bg-gradient-to-b from-transparent via-gold/50 to-transparent" />
      <div className="absolute right-24 top-0 hidden h-[140%] lg:block w-[2px] rotate-[32deg] origin-top bg-gradient-to-b from-transparent via-gold/25 to-transparent blur-[1px]" />
      <div className="absolute -left-10 bottom-0 hidden h-[90%] lg:block w-px -rotate-[32deg] origin-bottom bg-gradient-to-t from-transparent via-cyan/45 to-transparent" />
    </div>
  );
}

/** Botão dourado principal das telas de acesso, com reflexo no hover. */
export function GoldButton({
  loading,
  loadingLabel,
  children,
}: {
  loading?: boolean;
  loadingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={
        "btn-gold group relative mt-1 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[15px] font-bold tracking-wide " +
        "transition-[transform,filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_14px_40px_-12px_rgba(217,164,65,0.75)] " +
        "active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan " +
        "disabled:cursor-wait disabled:opacity-80"
      }
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent transition-[left] duration-700 group-hover:left-[120%]"
      />
      {loading ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-ink/80 border-r-transparent" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Card de vidro com filetes de luz dourado (topo) e ciano (base). */
export function GlassCard({ children }: { children: ReactNode }) {
  return (
    <div className="glass-gold rounded-[28px] p-7 sm:p-9">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-px left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan/70 to-transparent"
      />
      {children}
    </div>
  );
}

export function FormError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-[#ffb3ba]"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-danger shadow-[0_0_8px_#ff5d6c]" />
      {children}
    </p>
  );
}
