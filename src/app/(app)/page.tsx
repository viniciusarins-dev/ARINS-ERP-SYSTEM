import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, AlertTriangle, Users, ShoppingCart } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");

  const supabase = await createClient();
  const orgId = organization.id;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { count: productCount },
    { data: lowStockProducts },
    { count: customerCount },
    { data: salesThisMonth },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("active", true),
    supabase
      .from("products")
      .select("id, name, stock_quantity, min_stock")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("stock_quantity", { ascending: true })
      .limit(50),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("active", true),
    supabase
      .from("sales")
      .select("total")
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  const lowStock = (lowStockProducts ?? []).filter((p) => p.stock_quantity <= p.min_stock);
  const totalThisMonth = (salesThisMonth ?? []).reduce((sum, s) => sum + Number(s.total), 0);

  const kpis = [
    {
      label: "Produtos ativos",
      value: productCount ?? 0,
      icon: Package,
      href: "/produtos",
    },
    {
      label: "Estoque baixo",
      value: lowStock.length,
      icon: AlertTriangle,
      href: "/produtos",
      warn: lowStock.length > 0,
    },
    {
      label: "Clientes",
      value: customerCount ?? 0,
      icon: Users,
      href: "/clientes",
    },
    {
      label: "Vendas no mes",
      value: formatCurrency(totalThisMonth),
      icon: ShoppingCart,
      href: "/vendas",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-sm text-muted-foreground">Visao geral de {organization.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <kpi.icon
                  className={`size-4 ${kpi.warn ? "text-destructive" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${kpi.warn ? "text-destructive" : ""}`}>
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos com estoque baixo</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {lowStock.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">
                    {p.stock_quantity} / min. {p.min_stock}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
