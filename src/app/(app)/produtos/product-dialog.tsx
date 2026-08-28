"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

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
import {
  createProductAction,
  createCategoryAction,
  updateProductAction,
  type ActionResult,
} from "./actions";

interface Category {
  id: string;
  name: string;
}

interface ProductForEdit {
  id: string;
  sku: string;
  name: string;
  category_id: string | null;
  unit: string;
  cost_price: number;
  sale_price: number;
  min_stock: number;
}

const NO_CATEGORY = "__none__";

const initialState: ActionResult = {};

export function ProductDialog({
  categories,
  product,
  trigger,
}: {
  categories: Category[];
  product?: ProductForEdit;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isPending, startTransition] = useTransition();

  const action = product
    ? updateProductAction.bind(null, product.id)
    : createProductAction;

  const [state, formAction, pending] = useActionState(
    async (prevState: ActionResult, formData: FormData) => {
      const result = await action(prevState, formData);
      if (result.success) {
        toast.success(product ? "Produto atualizado" : "Produto criado");
        setOpen(false);
      }
      return result;
    },
    initialState
  );

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    startTransition(async () => {
      const result = await createCategoryAction(newCategoryName);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.id) {
        setLocalCategories((prev) => [...prev, { id: result.id!, name: newCategoryName.trim() }]);
        setNewCategoryName("");
      }
    });
  }

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
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU / codigo</Label>
              <Input id="sku" name="sku" defaultValue={product?.sku} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input id="unit" name="unit" defaultValue={product?.unit ?? "un"} required />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={product?.name} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select name="categoryId" defaultValue={product?.category_id ?? NO_CATEGORY}>
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
                disabled={isPending}
                onClick={handleAddCategory}
              >
                Adicionar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="costPrice">Preco de custo</Label>
              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product?.cost_price ?? 0}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="salePrice">Preco de venda</Label>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product?.sale_price ?? 0}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minStock">Estoque minimo</Label>
              <Input
                id="minStock"
                name="minStock"
                type="number"
                step="0.001"
                min="0"
                defaultValue={product?.min_stock ?? 0}
                required
              />
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
