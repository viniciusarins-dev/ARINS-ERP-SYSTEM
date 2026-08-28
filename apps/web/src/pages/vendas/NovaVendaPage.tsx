import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, type CreateSaleValues } from "@arins/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";

interface SaleProduct {
  id: string;
  sku: string;
  name: string;
  sale_price: number;
  stock_quantity: number;
  unit: string;
}

interface SaleCustomer {
  id: string;
  name: string;
}

interface CartItem {
  productId: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

const NO_CUSTOMER = "__none__";

export default function NovaVendaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: productsData } = useQuery({
    queryKey: ["products", "active-for-sale"],
    queryFn: () => api.get<{ products: SaleProduct[] }>("/api/products?active=true"),
  });
  const { data: customersData } = useQuery({
    queryKey: ["customers", "active-for-sale"],
    queryFn: () => api.get<{ customers: SaleCustomer[] }>("/api/customers?active=true"),
  });

  const products = productsData?.products ?? [];
  const customers = customersData?.customers ?? [];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerId, setCustomerId] = useState(NO_CUSTOMER);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const createSaleMutation = useMutation({
    mutationFn: (values: CreateSaleValues) => api.post<{ saleId: string }>("/api/sales", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/vendas");
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Erro ao registrar a venda";
      setError(message);
      toast.error(message);
    },
  });

  function handleAddItem() {
    const product = products.find((p) => p.id === selectedProductId);
    const qty = Number(quantity);
    if (!product || !qty || qty <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          unitPrice: product.sale_price,
          quantity: qty,
          stock: product.stock_quantity,
        },
      ];
    });
    setSelectedProductId("");
    setQuantity("1");
  }

  function updateItemQuantity(productId: string, value: string) {
    const qty = Number(value);
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
    );
  }

  function updateItemPrice(productId: string, value: string) {
    const price = Number(value);
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, unitPrice: price } : item))
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  function handleSubmit() {
    setError(null);

    if (cart.length === 0) {
      setError("Adicione pelo menos um item");
      return;
    }
    if (cart.some((item) => item.quantity <= 0)) {
      setError("Todas as quantidades precisam ser maiores que zero");
      return;
    }

    createSaleMutation.mutate({
      customerId: customerId === NO_CUSTOMER ? null : customerId,
      notes: notes || undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova venda</h1>
        <p className="text-sm text-muted-foreground">
          Selecione os produtos e o cliente para registrar a venda
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-64 flex-1 flex-col gap-2">
            <Label>Produto</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} &middot; {product.name} (estoque: {product.stock_quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-28 flex-col gap-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <Button type="button" onClick={handleAddItem} disabled={!selectedProductId}>
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="w-32">Quantidade</TableHead>
              <TableHead className="w-32">Preco unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cart.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum item adicionado.
                </TableCell>
              </TableRow>
            )}
            {cart.map((item) => (
              <TableRow key={item.productId}>
                <TableCell>
                  {item.name}
                  {item.quantity > item.stock && (
                    <p className="text-xs text-destructive">
                      Estoque disponivel: {item.stock} {item.unit}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateItemQuantity(item.productId, e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItemPrice(item.productId, e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="inline-flex size-8 items-center justify-center rounded-md text-destructive hover:bg-accent"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-64 flex-1 flex-col gap-2">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CUSTOMER}>Cliente avulso</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-64 flex-1 flex-col gap-2">
              <Label>Observacoes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-lg font-semibold">Total: {formatCurrency(total)}</span>
            <div className="flex items-center gap-3">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={handleSubmit}
                disabled={createSaleMutation.isPending || cart.length === 0}
              >
                {createSaleMutation.isPending ? "Registrando..." : "Registrar venda"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
