"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cancelSaleAction } from "./actions";

interface Sale {
  id: string;
  total: number;
  status: "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  customers: { id: string; name: string } | null;
}

export function SalesTable({ sales }: { sales: Sale[] }) {
  const [isPending, startTransition] = useTransition();

  function handleCancel(saleId: string) {
    startTransition(async () => {
      const result = await cancelSaleAction(saleId);
      if (result.error) toast.error(result.error);
      else toast.success("Venda cancelada e estoque estornado");
    });
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32 text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhuma venda registrada.
              </TableCell>
            </TableRow>
          )}
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell className="text-muted-foreground">
                {formatDate(sale.created_at)}
              </TableCell>
              <TableCell>{sale.customers?.name ?? "Cliente avulso"}</TableCell>
              <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
              <TableCell>
                <Badge variant={sale.status === "completed" ? "success" : "secondary"}>
                  {sale.status === "completed" ? "Concluida" : "Cancelada"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {sale.status === "completed" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isPending}>
                        Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar venda?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O estoque dos itens sera estornado automaticamente. Essa acao nao pode
                          ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCancel(sale.id)}>
                          Confirmar cancelamento
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
