import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { ProductsClient } from "./products-client";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*, categories(id, name)")
    .eq("organization_id", organization.id)
    .order("name", { ascending: true });

  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  }

  const [{ data: products }, { data: categories }] = await Promise.all([
    query,
    supabase
      .from("categories")
      .select("id, name")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true }),
  ]);

  return (
    <ProductsClient
      products={products ?? []}
      categories={categories ?? []}
      searchQuery={q ?? ""}
    />
  );
}
