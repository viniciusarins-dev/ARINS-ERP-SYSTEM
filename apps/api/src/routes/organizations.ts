import { Router } from "express";
import { onboardingSchema, slugify } from "@arins/shared";

import { getCurrentOrganization } from "../lib/organizations.js";
import { requireOrganization } from "../middleware/organization.js";

export const organizationsRouter = Router();

organizationsRouter.get("/me", async (req, res) => {
  const organization = await getCurrentOrganization(req.supabase);
  res.json({ organization });
});

organizationsRouter.get("/members", requireOrganization, async (req, res) => {
  const { data, error } = await req.supabase
    .from("memberships")
    .select("id, role, created_at, user_id")
    .eq("organization_id", req.organization.id)
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: "Erro ao listar equipe" });
    return;
  }

  res.json({ members: data });
});

organizationsRouter.post("/", async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const existing = await getCurrentOrganization(req.supabase);
  if (existing) {
    res.status(409).json({ error: "Usuario ja pertence a uma organizacao" });
    return;
  }

  const { data, error } = await req.supabase.rpc("create_organization_with_owner", {
    p_name: parsed.data.companyName,
    p_slug: slugify(parsed.data.companyName),
  });

  if (error) {
    res.status(500).json({ error: "Nao foi possivel criar a empresa" });
    return;
  }

  res.status(201).json({ id: data });
});
