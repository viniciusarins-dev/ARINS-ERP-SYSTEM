import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string, describedBy?: string) => ReactNode;
  className?: string;
};

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const descId = hint || error ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-cafe">
        {label}
      </label>
      {children(id, descId)}
      {(error || hint) && (
        <p id={descId} className={cn("text-xs", error ? "font-medium text-laranja-700" : "text-cafe-300")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const inputBase =
  "h-11 w-full rounded-control border-[1.5px] border-noite bg-white/70 px-3.5 text-[15px] text-noite " +
  "shadow-[inset_0_2px_0_0_rgb(38_27_23/0.08)] placeholder:text-cafe-300/80 " +
  "transition-[border-color,box-shadow,background-color] duration-150 " +
  "hover:bg-white focus:bg-white focus:outline-none focus:shadow-[inset_0_2px_0_0_rgb(38_27_23/0.08),0_0_0_3px_rgb(214_107_53/0.35)] " +
  "aria-[invalid=true]:border-laranja-600";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  prefix?: ReactNode;
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { prefix, invalid, className, ...props },
  ref,
) {
  if (!prefix) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, className)} {...props} />;
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center border-r-[1.5px] border-noite/15 font-mono text-xs font-semibold text-cafe">
        {prefix}
      </span>
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(inputBase, "pl-14", className)}
        {...props}
      />
    </div>
  );
});
