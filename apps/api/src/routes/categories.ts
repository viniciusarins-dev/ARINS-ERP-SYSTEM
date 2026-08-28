import { Router } from "express";
import { z } from "zod";

import { requireOrganization } from "../middleware/organization.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireOrganization);

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria"),
});

categoriesRouter.get("/", async (req, res) => {
  const { data, error } = await req.supabase
    .from("categories")
    .select("id, name")
    .eq("organization_id", req.organization.id)
    .order("name", { ascending: true });

  if (error) {
    res.status(500).json({ error: "Erro ao listar categorias" });
    return;
  }

  res.json({ categories: data });
});

categoriesRouter.post("/", async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const { data, error } = await req.supabase
    .from("categories")
    .insert({ organization_id: req.organization.id, name: parsed.data.name })
    .select("id, name")
    .single();

  if (error) {
    res.status(error.code === "23505" ? 409 : 500).json({
      error: error.code === "23505" ? "Ja existe uma categoria com esse nome" : "Erro ao criar categoria",
    });
    return;
  }

  res.status(201).json({ category: data });
});
