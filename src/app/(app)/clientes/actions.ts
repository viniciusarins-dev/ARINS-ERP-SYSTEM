"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { customerSchema } from "@/lib/validations/customer";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

async function requireOrganization() {
  const organization = await getCurrentOrganization();
  if (!organization) throw new Error("Nenhuma organizacao ativa");
  return organization;
}

function parseCustomerForm(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createCustomerAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const organization = await requireOrganization();
  const parsed = parseCustomerForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    organization_id: organization.id,
    name: parsed.data.name,
    document: parsed.data.document || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: "Erro ao criar cliente" };
  }

  revalidatePath("/clientes");
  return { success: true };
}

export async function updateCustomerAction(
  customerId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const organization = await requireOrganization();
  const parsed = parseCustomerForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      document: parsed.data.document || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", customerId)
    .eq("organization_id", organization.id);

  if (error) {
    return { error: "Erro ao atualizar cliente" };
  }

  revalidatePath("/clientes");
  return { success: true };
}

export async function toggleCustomerActiveAction(customerId: string, active: boolean) {
  const organization = await requireOrganization();
  const supabase = await createClient();

  await supabase
    .from("customers")
    .update({ active })
    .eq("id", customerId)
    .eq("organization_id", organization.id);

  revalidatePath("/clientes");
}
