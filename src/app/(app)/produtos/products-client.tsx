"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Search } from "lucide-react";
import { toast } from "sonner";

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
import { formatCurrency } from "@/lib/format";
import { ProductDialog } from "./product-dialog";
import { StockDialog } from "./stock-dialog";
import { toggleProductActiveAction } from "./actions";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  active: boolean;
  category_id: string | null;
  categories: { id: string; name: string } | null;
}

export function ProductsClient({
  products,
  categories,
  searchQuery,
}: {
  products: Product[];
  categories: Category[];
  searchQuery: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchQuery);
  const [, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) params.set("q", search);
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleToggleActive(productId: string, active: boolean) {
    startTransition(async () => {
      await toggleProductActiveAction(productId, active);
      toast.success(active ? "Produto ativado" : "Produto desativado");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Catalogo, precos e controle de estoque
          </p>
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
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => {
              const lowStock = product.stock_quantity <= product.min_stock;
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.categories?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.cost_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.sale_price)}
                  </TableCell>
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
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
