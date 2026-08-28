"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { createSaleSchema, type CreateSaleValues } from "@/lib/validations/sale";

export interface SaleActionResult {
  error?: string;
  success?: boolean;
}

async function requireOrganization() {
  const organization = await getCurrentOrganization();
  if (!organization) throw new Error("Nenhuma organizacao ativa");
  return organization;
}

export async function createSaleAction(input: CreateSaleValues): Promise<SaleActionResult> {
  const organization = await requireOrganization();
  const parsed = createSaleSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_sale", {
    p_organization_id: organization.id,
    p_customer_id: parsed.data.customerId,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    p_notes: parsed.data.notes || null,
  });

  if (error) {
    return {
      error: error.message.includes("estoque insuficiente")
        ? "Estoque insuficiente para um dos itens"
        : "Erro ao registrar a venda",
    };
  }

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  redirect("/vendas");
}

export async function cancelSaleAction(saleId: string): Promise<SaleActionResult> {
  await requireOrganization();
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_sale", { p_sale_id: saleId });

  if (error) {
    return { error: "Erro ao cancelar a venda" };
  }

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  return { success: true };
}
