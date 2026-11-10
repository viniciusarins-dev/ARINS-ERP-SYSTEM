import { forwardRef, type InputHTMLAttributes } from "react";

import { formatBRLNumber } from "@/lib/format";

import { Input } from "./Field";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** valor em centavos */
  value: number;
  onValueChange: (cents: number) => void;
  invalid?: boolean;
};

/** Máscara monetária: os dígitos entram pela direita (1500 → 15,00). Sempre em centavos. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, className, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      prefix="R$"
      inputMode="numeric"
      autoComplete="off"
      className={`tabular font-semibold ${className ?? ""}`}
      value={value ? formatBRLNumber(value) : ""}
      placeholder="0,00"
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
        onValueChange(digits ? parseInt(digits, 10) : 0);
      }}
      {...props}
    />
  );
});
