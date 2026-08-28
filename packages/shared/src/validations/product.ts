import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().trim().min(1, "Informe o SKU/codigo"),
  name: z.string().trim().min(1, "Informe o nome do produto"),
  categoryId: z.string().uuid().nullable().optional(),
  unit: z.string().trim().min(1).default("un"),
  costPrice: z.coerce.number().min(0, "O custo nao pode ser negativo"),
  salePrice: z.coerce.number().min(0, "O preco de venda nao pode ser negativo"),
  minStock: z.coerce.number().min(0, "O estoque minimo nao pode ser negativo"),
});

export type ProductValues = z.infer<typeof productSchema>;

export const stockAdjustmentSchema = z
  .object({
    productId: z.string().uuid(),
    type: z.enum(["entrada", "saida", "ajuste"]),
    quantity: z.coerce.number(),
    reason: z.string().trim().max(280).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "ajuste" && data.quantity <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "A quantidade precisa ser maior que zero",
      });
    }
    if (data.type === "ajuste" && data.quantity === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "A quantidade nao pode ser zero",
      });
    }
  });

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;
