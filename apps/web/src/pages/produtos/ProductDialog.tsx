import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { productSchema, type ProductValues } from "@arins/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import type { Category, Product } from "@/lib/types";

const NO_CATEGORY = "__none__";

export function ProductDialog({
  categories,
  product,
  trigger,
}: {
  categories: Category[];
  product?: Product;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof productSchema>, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          categoryId: product.category_id,
          unit: product.unit,
          costPrice: product.cost_price,
          salePrice: product.sale_price,
          minStock: product.min_stock,
        }
      : { unit: "un", costPrice: 0, salePrice: 0, minStock: 0, categoryId: null },
  });

  const categoryId = watch("categoryId");

  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => api.post<{ category: Category }>("/api/categories", { name }),
    onSuccess: (result) => {
      setLocalCategories((prev) => [...prev, result.category]);
      setValue("categoryId", result.category.id);
      setNewCategoryName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao criar categoria"),
  });

  const saveMutation = useMutation({
    mutationFn: (values: ProductValues) =>
      product
        ? api.patch(`/api/products/${product.id}`, values)
        : api.post("/api/products", values),
    onSuccess: () => {
      toast.success(product ? "Produto atualizado" : "Produto criado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar produto"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus />
            Novo produto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU / codigo</Label>
              <Input id="sku" {...register("sku")} />
              {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input id="unit" {...register("unit")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select
              value={categoryId ?? NO_CATEGORY}
              onValueChange={(v) => setValue("categoryId", v === NO_CATEGORY ? null : v)}
            >
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                {localCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Nova categoria"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addCategoryMutation.isPending || !newCategoryName.trim()}
                onClick={() => addCategoryMutation.mutate(newCategoryName)}
              >
                Adicionar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="costPrice">Preco de custo</Label>
              <Input id="costPrice" type="number" step="0.01" min="0" {...register("costPrice")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="salePrice">Preco de venda</Label>
              <Input id="salePrice" type="number" step="0.01" min="0" {...register("salePrice")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minStock">Estoque minimo</Label>
              <Input id="minStock" type="number" step="0.001" min="0" {...register("minStock")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
