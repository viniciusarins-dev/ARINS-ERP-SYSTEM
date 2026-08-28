import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantidade invalida"),
  unitPrice: z.coerce.number().min(0, "Preco invalido"),
});

export const createSaleSchema = z.object({
  customerId: z.string().uuid().nullable(),
  notes: z.string().trim().max(280).optional(),
  items: z.array(saleItemSchema).min(1, "Adicione pelo menos um item"),
});

export type CreateSaleValues = z.infer<typeof createSaleSchema>;
