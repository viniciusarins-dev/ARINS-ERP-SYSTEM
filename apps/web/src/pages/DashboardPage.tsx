import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, AlertTriangle, Users, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@arins/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface DashboardData {
  activeProductCount: number;
  lowStock: { id: string; name: string; stock_quantity: number; min_stock: number }[];
  lowStockCount: number;
  customerCount: number;
  totalThisMonth: number;
}

export default function DashboardPage() {
  const { organization } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });

  const kpis = [
    { label: "Produtos ativos", value: data?.activeProductCount ?? 0, icon: Package, href: "/produtos" },
    {
      label: "Estoque baixo",
      value: data?.lowStockCount ?? 0,
      icon: AlertTriangle,
      href: "/produtos",
      warn: (data?.lowStockCount ?? 0) > 0,
    },
    { label: "Clientes", value: data?.customerCount ?? 0, icon: Users, href: "/clientes" },
    {
      label: "Vendas no mes",
      value: formatCurrency(data?.totalThisMonth ?? 0),
      icon: ShoppingCart,
      href: "/vendas",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-sm text-muted-foreground">Visao geral de {organization?.name}</p>
      </div>

      {isError ? (
        <Card>
          <CardContent>
            <ErrorState message="Nao foi possivel carregar o painel." onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <Link key={kpi.label} to={kpi.href}>
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
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className={`text-2xl font-bold ${kpi.warn ? "text-destructive" : ""}`}>
                        {kpi.value}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {isLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Produtos com estoque baixo</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          )}

          {!isLoading && !!data?.lowStock.length && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Produtos com estoque baixo</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm">
                  {data.lowStock.slice(0, 8).map((p) => (
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
        </>
      )}
    </div>
  );
}
