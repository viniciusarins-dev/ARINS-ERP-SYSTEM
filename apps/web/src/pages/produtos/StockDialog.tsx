import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { stockAdjustmentSchema, type StockAdjustmentValues } from "@arins/shared";

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
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof stockAdjustmentSchema>, unknown, StockAdjustmentValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: { productId, type: "entrada", quantity: 0 },
  });

  const type = watch("type");

  const mutation = useMutation({
    mutationFn: (values: StockAdjustmentValues) =>
      api.post(`/api/products/${productId}/stock-movements`, values),
    onSuccess: () => {
      toast.success("Estoque atualizado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      reset({ productId, type: "entrada", quantity: 0 });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao movimentar estoque"),
  });

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
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setValue("type", v as StockAdjustmentValues["type"])}
            >
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
            <Input id="quantity" type="number" step="0.001" {...register("quantity")} />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Input id="reason" {...register("reason")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
