import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@arins/shared";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { api, ApiError } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { ProductDialog } from "./ProductDialog";
import { StockDialog } from "./StockDialog";

const COLUMN_COUNT = 8;

export default function ProdutosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(initialQuery);
  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["products", initialQuery],
    queryFn: () =>
      api.get<{ products: Product[] }>(
        `/api/products${initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : ""}`
      ),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<{ categories: Category[] }>("/api/categories"),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) params.set("q", search);
    else params.delete("q");
    setSearchParams(params);
  }

  async function handleToggleActive(productId: string, active: boolean) {
    try {
      await api.patch(`/api/products/${productId}/active`, { active });
      toast.success(active ? "Produto ativado" : "Produto desativado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar produto");
    }
  }

  const categories = categoriesData?.categories ?? [];
  const productList = products?.products ?? [];
  const hasSearch = Boolean(initialQuery);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Catalogo, precos e controle de estoque</p>
        </div>
        <ProductDialog categories={categories} />
      </div>

      <form onSubmit={handleSearch} className="flex max-w-sm gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou SKU..."
        />
        <button type="submit" className="sr-only">
          Buscar
        </button>
        <Search className="mt-2 size-4 shrink-0 text-muted-foreground" />
      </form>

      <div className="rounded-xl border bg-card">
        {isError ? (
          <ErrorState message="Nao foi possivel carregar os produtos." onRetry={() => refetch()} />
        ) : !isLoading && productList.length === 0 ? (
          <EmptyState
            icon={Package}
            title={hasSearch ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
            description={
              hasSearch
                ? "Tente buscar por outro nome ou SKU."
                : "Cadastre o primeiro produto pra comecar a controlar seu estoque."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Venda</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-24 text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columns={COLUMN_COUNT} />
              ) : (
                productList.map((product) => {
                  const lowStock = product.stock_quantity <= product.min_stock;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.categories?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lowStock && <Badge variant="destructive">baixo</Badge>}
                          <span>
                            {product.stock_quantity} {product.unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={product.active}
                          onCheckedChange={(checked) => handleToggleActive(product.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <StockDialog
                            productId={product.id}
                            productName={product.name}
                            currentStock={product.stock_quantity}
                          />
                          <ProductDialog
                            categories={categories}
                            product={product}
                            trigger={
                              <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
                                title="Editar"
                              >
                                <Pencil className="size-4" />
                              </button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
