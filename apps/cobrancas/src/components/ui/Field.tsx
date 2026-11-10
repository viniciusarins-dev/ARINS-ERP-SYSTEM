import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string, describedBy?: string) => ReactNode;
  className?: string;
  "data-field"?: string;
};

export function Field({ label, hint, error, children, className, "data-field": dataField }: FieldProps) {
  const id = useId();
  const descId = hint || error ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)} data-field={dataField}>
      <label htmlFor={id} className="text-[13px] font-medium text-mist">
        {label}
      </label>
      {children(id, descId)}
      {(error || hint) && (
        <p id={descId} className={cn("text-xs", error ? "font-medium text-[#ff8f9a]" : "text-mist-600")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const inputBase =
  "h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3.5 text-[15px] text-ice placeholder:text-mist-700 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-white/20 focus:border-cyan/70 focus:bg-white/[0.05] focus:outline-none " +
  "focus:shadow-[0_0_0_4px_rgba(53,221,251,0.12),0_0_24px_-6px_rgba(53,221,251,0.5)] " +
  "disabled:cursor-not-allowed aria-[invalid=true]:border-danger/60";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { prefix?: ReactNode; invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ prefix, invalid, className, ...props }, ref) {
  if (!prefix) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, className)} {...props} />;
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 grid w-12 place-items-center border-r border-white/[0.06] text-xs font-semibold text-gold/80">
        {prefix}
      </span>
      <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, "pl-15", className)} {...props} />
    </div>
  );
});
