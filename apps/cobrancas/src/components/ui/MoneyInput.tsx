import { forwardRef, type InputHTMLAttributes } from "react";

import { formatBRLNumber } from "@/lib/format";

import { Input } from "./Field";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** valor em centavos */
  value: number;
  onValueChange: (cents: number) => void;
  invalid?: boolean;
};

/**
 * Máscara monetária no estilo "caixa registradora": os dígitos entram pela
 * direita (digitar 1500 → 15,00). Trabalha sempre em centavos inteiros.
 */
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
      className={`tabular font-mono text-[15px] ${className ?? ""}`}
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
