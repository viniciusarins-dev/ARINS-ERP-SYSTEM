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

/** Seletor segmentado estilo "chave física" — o item ativo afunda e acende. */
export function Segmented<T extends string>({ value, onChange, options, ariaLabel, className }: SegmentedProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex gap-1 rounded-[14px] border-[1.5px] border-noite bg-creme-300/60 p-1 shadow-[inset_0_2px_0_0_rgb(38_27_23/0.1)]",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <label
            key={opt.value}
            className={cn(
              "relative flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold",
              "transition-[background-color,color,box-shadow] duration-150 [&_svg]:size-4",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laranja",
              active
                ? "gloss border-[1.5px] border-noite bg-gradient-to-b from-noite-700 to-noite text-creme shadow-hard-sm"
                : "border-[1.5px] border-transparent text-cafe hover:bg-creme-50/70",
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={active}
              onChange={() => onChange(opt.value)}
            />
            {opt.icon}
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
