import { useId, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: string; icon?: ReactNode };

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  ariaLabel: string;
  className?: string;
};

export function Segmented<T extends string>({ value, onChange, options, ariaLabel, className }: SegmentedProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <label
            key={opt.value}
            className={cn(
              "relative flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold",
              "transition-[background-color,color,border-color,box-shadow] duration-200 [&_svg]:size-4",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan",
              active
                ? "border-gold/50 bg-gold/[0.14] text-gold-200 shadow-[0_0_20px_-8px_rgba(217,164,65,0.8)]"
                : "border-transparent text-mist hover:bg-white/[0.04] hover:text-ice",
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={active} onChange={() => onChange(opt.value)} />
            {opt.icon}
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
