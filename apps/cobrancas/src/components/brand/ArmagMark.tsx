import { cn } from "@/lib/cn";

/** Escudo + nome ARMAG. O escudo é a imagem oficial da marca. */
export function ArmagMark({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img
        src="/brand/escudo.png"
        alt=""
        width={44}
        height={44}
        draggable={false}
        className={cn("shrink-0 rounded-xl drop-shadow-[0_0_14px_rgba(217,164,65,0.35)]", compact ? "size-9" : "size-11")}
      />
      <span className="leading-none">
        <span className={cn("block font-brand font-bold tracking-[0.14em] text-gold-metal", compact ? "text-lg" : "text-[22px]")}>
          ARMAG
        </span>
        <span className="mt-1 block font-brand text-[9px] font-semibold uppercase tracking-[0.5em] text-gold/70">
          Cobranças
        </span>
      </span>
    </span>
  );
}
