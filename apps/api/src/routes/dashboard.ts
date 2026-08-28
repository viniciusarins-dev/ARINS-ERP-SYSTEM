import { Router } from "express";

import { requireOrganization } from "../middleware/organization.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireOrganization, async (req, res) => {
  const orgId = req.organization.id;
  const supabase = req.supabase;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { count: productCount },
    { data: lowStockProducts },
    { count: customerCount },
    { data: salesThisMonth },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("active", true),
    supabase
      .from("products")
      .select("id, name, stock_quantity, min_stock")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("stock_quantity", { ascending: true })
      .limit(50),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("active", true),
    supabase
      .from("sales")
      .select("total")
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  const lowStock = (lowStockProducts ?? []).filter((p) => p.stock_quantity <= p.min_stock);
  const totalThisMonth = (salesThisMonth ?? []).reduce((sum, s) => sum + Number(s.total), 0);

  res.json({
    activeProductCount: productCount ?? 0,
    lowStock: lowStock.slice(0, 8),
    lowStockCount: lowStock.length,
    customerCount: customerCount ?? 0,
    totalThisMonth,
  });
});
