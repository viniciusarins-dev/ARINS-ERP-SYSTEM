import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { Button } from "@/components/ui/button";
import { SalesTable } from "./sales-table";

export default async function VendasPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");

  const supabase = await createClient();
  const { data: sales } = await supabase
    .from("sales")
    .select("id, total, status, notes, created_at, customers(id, name)")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vendas</h1>
          <p className="text-sm text-muted-foreground">Historico de vendas</p>
        </div>
        <Button asChild size="sm">
          <Link href="/vendas/nova">
            <Plus />
            Nova venda
          </Link>
        </Button>
      </div>

      <SalesTable sales={sales ?? []} />
    </div>
  );
}
