import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { NewSaleForm } from "./new-sale-form";

export default async function NovaVendaPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, name, sale_price, stock_quantity, unit")
      .eq("organization_id", organization.id)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", organization.id)
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova venda</h1>
        <p className="text-sm text-muted-foreground">
          Selecione os produtos e o cliente para registrar a venda
        </p>
      </div>
      <NewSaleForm products={products ?? []} customers={customers ?? []} />
    </div>
  );
}
