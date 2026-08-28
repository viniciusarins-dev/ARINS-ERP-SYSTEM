import { Router } from "express";
import { customerSchema } from "@arins/shared";

import { requireOrganization } from "../middleware/organization.js";

export const customersRouter = Router();
customersRouter.use(requireOrganization);

customersRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;

  let query = req.supabase
    .from("customers")
    .select("*")
    .eq("organization_id", req.organization.id)
    .order("name", { ascending: true });

  if (q) {
    query = query.or(`name.ilike.%${q}%,document.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  if (req.query.active === "true") {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: "Erro ao listar clientes" });
    return;
  }

  res.json({ customers: data });
});

customersRouter.post("/", async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const { data, error } = await req.supabase
    .from("customers")
    .insert({
      organization_id: req.organization.id,
      name: parsed.data.name,
      document: parsed.data.document || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: "Erro ao criar cliente" });
    return;
  }

  res.status(201).json({ customer: data });
});

customersRouter.patch("/:id", async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  const { data, error } = await req.supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      document: parsed.data.document || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", req.params.id)
    .eq("organization_id", req.organization.id)
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: "Erro ao atualizar cliente" });
    return;
  }

  res.json({ customer: data });
});

customersRouter.patch("/:id/active", async (req, res) => {
  const active = Boolean(req.body?.active);

  const { error } = await req.supabase
    .from("customers")
    .update({ active })
    .eq("id", req.params.id)
    .eq("organization_id", req.organization.id);

  if (error) {
    res.status(500).json({ error: "Erro ao atualizar cliente" });
    return;
  }

  res.status(204).end();
});
