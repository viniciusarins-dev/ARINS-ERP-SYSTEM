"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { productSchema, stockAdjustmentSchema } from "@/lib/validations/product";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

async function requireOrganization() {
  const organization = await getCurrentOrganization();
  if (!organization) throw new Error("Nenhuma organizacao ativa");
  return organization;
}

// The category <Select> uses this sentinel for "no category" since Radix
// Select cannot represent an empty-string item value.
const NO_CATEGORY_VALUE = "__none__";

function parseCategoryId(formData: FormData) {
  const value = formData.get("categoryId");
  return !value || value === NO_CATEGORY_VALUE ? null : value;
}

export async function createProductAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const organization = await requireOrganization();

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    categoryId: parseCategoryId(formData),
    unit: formData.get("unit") || "un",
    costPrice: formData.get("costPrice"),
    salePrice: formData.get("salePrice"),
    minStock: formData.get("minStock"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    organization_id: organization.id,
    sku: parsed.data.sku,
    name: parsed.data.name,
    category_id: parsed.data.categoryId ?? null,
    unit: parsed.data.unit,
    cost_price: parsed.data.costPrice,
    sale_price: parsed.data.salePrice,
    min_stock: parsed.data.minStock,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "Ja existe um produto com esse SKU" : "Erro ao criar produto",
    };
  }

  revalidatePath("/produtos");
  return { success: true };
}

export async function updateProductAction(
  productId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const organization = await requireOrganization();

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    categoryId: parseCategoryId(formData),
    unit: formData.get("unit") || "un",
    costPrice: formData.get("costPrice"),
    salePrice: formData.get("salePrice"),
    minStock: formData.get("minStock"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
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
    .eq("id", productId)
    .eq("organization_id", organization.id);

  if (error) {
    return {
      error: error.code === "23505" ? "Ja existe um produto com esse SKU" : "Erro ao atualizar produto",
    };
  }

  revalidatePath("/produtos");
  return { success: true };
}

export async function createCategoryAction(name: string): Promise<ActionResult & { id?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe o nome da categoria" };

  const organization = await requireOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({ organization_id: organization.id, name: trimmed })
    .select("id")
    .single();

  if (error) {
    return {
      error: error.code === "23505" ? "Ja existe uma categoria com esse nome" : "Erro ao criar categoria",
    };
  }

  revalidatePath("/produtos");
  return { success: true, id: data.id };
}

export async function toggleProductActiveAction(productId: string, active: boolean) {
  const organization = await requireOrganization();
  const supabase = await createClient();

  await supabase
    .from("products")
    .update({ active })
    .eq("id", productId)
    .eq("organization_id", organization.id);

  revalidatePath("/produtos");
}

export async function adjustStockAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const organization = await requireOrganization();

  const parsed = stockAdjustmentSchema.safeParse({
    productId: formData.get("productId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stock_movements").insert({
    organization_id: organization.id,
    product_id: parsed.data.productId,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    reason: parsed.data.reason,
  });

  if (error) {
    return {
      error: error.message.includes("estoque insuficiente")
        ? "Estoque insuficiente para essa saida"
        : "Erro ao registrar movimentacao de estoque",
    };
  }

  revalidatePath("/produtos");
  return { success: true };
}
