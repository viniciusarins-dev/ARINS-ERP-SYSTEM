import { Router } from "express";
import { createSaleSchema } from "@arins/shared";

import { requireOrganization } from "../middleware/organization.js";

export const salesRouter = Router();
salesRouter.use(requireOrganization);

salesRouter.get("/", async (req, res) => {
  const { data, error } = await req.supabase
    .from("sales")
    .select("id, total, status, notes, created_at, customers(id, name)")
    .eq("organization_id", req.organization.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    res.status(500).json({ error: "Erro ao listar vendas" });
    return;
  }

  res.json({ sales: data });
});

salesRouter.post("/", async (req, res) => {
  const parsed = createSaleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const { data, error } = await req.supabase.rpc("create_sale", {
    p_organization_id: req.organization.id,
    p_customer_id: parsed.data.customerId,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    p_notes: parsed.data.notes || null,
  });

  if (error) {
    res.status(422).json({
      error: error.message.includes("estoque insuficiente")
        ? "Estoque insuficiente para um dos itens"
        : "Erro ao registrar a venda",
    });
    return;
  }

  res.status(201).json({ saleId: data });
});

salesRouter.post("/:id/cancel", async (req, res) => {
  const { error } = await req.supabase.rpc("cancel_sale", { p_sale_id: req.params.id });

  if (error) {
    res.status(422).json({ error: "Erro ao cancelar a venda" });
    return;
  }

  res.status(204).end();
});
