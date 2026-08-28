import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { CustomersClient } from "./customers-client";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name", { ascending: true });

  if (q) {
    query = query.or(`name.ilike.%${q}%,document.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: customers } = await query;

  return <CustomersClient customers={customers ?? []} searchQuery={q ?? ""} />;
}
