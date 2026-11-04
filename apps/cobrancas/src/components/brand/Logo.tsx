import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

import { Sparkle } from "./Sparkle";

type LogoProps = {
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { mark: "size-8 rounded-[10px]", star: "size-4", word: "text-base", chip: "text-[9px] px-1.5" },
  md: { mark: "size-10 rounded-xl", star: "size-5", word: "text-xl", chip: "text-[10px] px-1.5" },
  lg: { mark: "size-16 rounded-[20px]", star: "size-8", word: "text-4xl", chip: "text-xs px-2" },
};

export function LogoMark({ size = "md", className }: Pick<LogoProps, "size" | "className">) {
  const s = sizes[size];
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center border-[1.5px] border-noite bg-noite",
        s.mark,
        className,
      )}
    >
      <span className="absolute inset-[3px] rounded-[inherit] bg-gradient-to-b from-noite-700 to-noite scanlines" />
      <Sparkle className={cn("relative text-laranja drop-shadow-[0_0_6px_rgba(214,107,53,0.6)]", s.star)} />
    </span>
  );
}

export function Logo({ tone = "dark", size = "md", className }: LogoProps) {
  const s = sizes[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="inline-flex items-start gap-1">
        <span
          className={cn(
            "font-display font-[800] leading-none tracking-[-0.04em]",
            s.word,
            tone === "dark" ? "text-noite" : "text-creme",
          )}
        >
          {brand.name.toLowerCase()}
        </span>
        <span
          className={cn(
            "chrome rounded-chip border border-noite/60 py-px font-pixel leading-tight text-noite",
            s.chip,
          )}
        >
          {brand.suffix}
        </span>
      </span>
    </span>
  );
}
