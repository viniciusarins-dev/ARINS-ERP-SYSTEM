import { Router } from "express";
import { productSchema, stockAdjustmentSchema } from "@arins/shared";

import { requireOrganization } from "../middleware/organization.js";

export const productsRouter = Router();
productsRouter.use(requireOrganization);

// The web app's category <Select> uses this sentinel for "no category"
// since it cannot represent an empty-string item value.
const NO_CATEGORY_VALUE = "__none__";

function parseCategoryId(value: unknown): string | null {
  return !value || value === NO_CATEGORY_VALUE ? null : (value as string);
}

productsRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;

  let query = req.supabase
    .from("products")
    .select("*, categories(id, name)")
    .eq("organization_id", req.organization.id)
    .order("name", { ascending: true });

  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  }

  if (req.query.active === "true") {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: "Erro ao listar produtos" });
    return;
  }

  res.json({ products: data });
});

productsRouter.post("/", async (req, res) => {
  const parsed = productSchema.safeParse({
    ...req.body,
    categoryId: parseCategoryId(req.body?.categoryId),
  });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const { data, error } = await req.supabase
    .from("products")
    .insert({
      organization_id: req.organization.id,
      sku: parsed.data.sku,
      name: parsed.data.name,
      category_id: parsed.data.categoryId ?? null,
      unit: parsed.data.unit,
      cost_price: parsed.data.costPrice,
      sale_price: parsed.data.salePrice,
      min_stock: parsed.data.minStock,
    })
    .select("*, categories(id, name)")
    .single();

  if (error) {
    res.status(error.code === "23505" ? 409 : 500).json({
      error: error.code === "23505" ? "Ja existe um produto com esse SKU" : "Erro ao criar produto",
    });
    return;
  }

  res.status(201).json({ product: data });
});

productsRouter.patch("/:id", async (req, res) => {
  const parsed = productSchema.safeParse({
    ...req.body,
    categoryId: parseCategoryId(req.body?.categoryId),
  });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const { data, error } = await req.supabase
    .from("products")
    .update({
      sku: parsed.data.sku,
      name: parsed.data.name,
      category_id: parsed.data.categoryId ?? null,
      unit: parsed.data.unit,
      cost_price: parsed.data.costPrice,
      sale_price: parsed.data.salePrice,
      min_stock: parsed.data.minStock,
    })
    .eq("id", req.params.id)
    .eq("organization_id", req.organization.id)
    .select("*, categories(id, name)")
    .single();

  if (error) {
    res.status(error.code === "23505" ? 409 : 500).json({
      error: error.code === "23505" ? "Ja existe um produto com esse SKU" : "Erro ao atualizar produto",
    });
    return;
  }

  res.json({ product: data });
});

productsRouter.patch("/:id/active", async (req, res) => {
  const active = Boolean(req.body?.active);

  const { error } = await req.supabase
    .from("products")
    .update({ active })
    .eq("id", req.params.id)
    .eq("organization_id", req.organization.id);

  if (error) {
    res.status(500).json({ error: "Erro ao atualizar produto" });
    return;
  }

  res.status(204).end();
});

productsRouter.post("/:id/stock-movements", async (req, res) => {
  const parsed = stockAdjustmentSchema.safeParse({ ...req.body, productId: req.params.id });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const { error } = await req.supabase.from("stock_movements").insert({
    organization_id: req.organization.id,
    product_id: parsed.data.productId,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    reason: parsed.data.reason,
  });

  if (error) {
    res.status(422).json({
      error: error.message.includes("estoque insuficiente")
        ? "Estoque insuficiente para essa saida"
        : "Erro ao registrar movimentacao de estoque",
    });
    return;
  }

  res.status(201).json({ success: true });
});
