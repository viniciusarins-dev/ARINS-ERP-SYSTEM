"use client";

import { useActionState, useState } from "react";
import { PackagePlus } from "lucide-react";
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
import { adjustStockAction, type ActionResult } from "./actions";

const initialState: ActionResult = {};

export function StockDialog({
  productId,
  productName,
  currentStock,
}: {
  productId: string;
  productName: string;
  currentStock: number;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"entrada" | "saida" | "ajuste">("entrada");

  const [state, formAction, pending] = useActionState(
    async (prevState: ActionResult, formData: FormData) => {
      const result = await adjustStockAction(prevState, formData);
      if (result.success) {
        toast.success("Estoque atualizado");
        setOpen(false);
      }
      return result;
    },
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Ajustar estoque">
          <PackagePlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {productName} &middot; estoque atual: {currentStock}
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="productId" value={productId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select name="type" value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada (compra/reposicao)</SelectItem>
                <SelectItem value="saida">Saida manual</SelectItem>
                <SelectItem value="ajuste">Ajuste (correcao de contagem)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="quantity">
              Quantidade {type === "ajuste" && "(use negativo para reduzir)"}
            </Label>
            <Input id="quantity" name="quantity" type="number" step="0.001" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Input id="reason" name="reason" />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
