import { z } from "zod";

// Accepts CNPJ with or without punctuation; the server re-validates and
// normalizes before calling the fiscal provider.
export const fiscalConfigSchema = z.object({
  cnpj: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 14, "CNPJ precisa ter 14 digitos"),
  regimeTributario: z.enum(["simples_nacional", "lucro_presumido", "lucro_real"]),
  inscricaoEstadual: z.string().trim().max(30).optional().or(z.literal("")),
  certificatePassword: z.string().min(1, "Informe a senha do certificado"),
});

export type FiscalConfigValues = z.infer<typeof fiscalConfigSchema>;

export const emitFiscalDocumentSchema = z.object({
  type: z.enum(["nfce", "nfe"]).default("nfce"),
});

export type EmitFiscalDocumentValues = z.infer<typeof emitFiscalDocumentSchema>;
