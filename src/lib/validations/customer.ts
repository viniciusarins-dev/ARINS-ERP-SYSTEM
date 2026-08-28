import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cliente"),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail invalido").optional().or(z.literal("")),
  address: z.string().trim().max(280).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CustomerValues = z.infer<typeof customerSchema>;
