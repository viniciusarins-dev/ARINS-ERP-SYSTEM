import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@arins/shared";

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
import { api, ApiError } from "@/lib/api";
import type { Sale } from "@/lib/types";

interface FiscalDocument {
  id: string;
  sale_id: string;
  status: "pending" | "processing" | "authorized" | "rejected" | "cancelled";
  danfe_url: string | null;
  error_message: string | null;
}

const FISCAL_BADGE: Record<FiscalDocument["status"], { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  authorized: { label: "Nota autorizada", variant: "success" },
  processing: { label: "Processando...", variant: "warning" },
  pending: { label: "Processando...", variant: "warning" },
  rejected: { label: "Nota rejeitada", variant: "destructive" },
  cancelled: { label: "Nota cancelada", variant: "secondary" },
};

export default function VendasPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["sales"],
    queryFn: () => api.get<{ sales: Sale[] }>("/api/sales"),
  });
  const { data: fiscalData } = useQuery({
    queryKey: ["fiscal-documents"],
    queryFn: () => api.get<{ documents: FiscalDocument[] }>("/api/fiscal/documents"),
  });

  async function handleCancel(saleId: string) {
    try {
      await api.post(`/api/sales/${saleId}/cancel`);
      toast.success("Venda cancelada e estoque estornado");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cancelar a venda");
    }
  }

  async function handleEmitNfce(saleId: string) {
    try {
      await api.post(`/api/fiscal/sales/${saleId}/emit`);
      toast.success("Nota fiscal enviada para autorizacao");
      queryClient.invalidateQueries({ queryKey: ["fiscal-documents"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao emitir nota fiscal");
    }
  }

  const sales = data?.sales ?? [];
  const documentsBySale = new Map((fiscalData?.documents ?? []).map((doc) => [doc.sale_id, doc]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vendas</h1>
          <p className="text-sm text-muted-foreground">Historico de vendas</p>
        </div>
        <Button asChild size="sm">
          <Link to="/vendas/nova">
            <Plus />
            Nova venda
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nota fiscal</TableHead>
              <TableHead className="w-32 text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma venda registrada.
                </TableCell>
              </TableRow>
            )}
            {sales.map((sale) => {
              const document = documentsBySale.get(sale.id);
              return (
                <TableRow key={sale.id}>
                  <TableCell className="text-muted-foreground">{formatDate(sale.created_at)}</TableCell>
                  <TableCell>{sale.customers?.name ?? "Cliente avulso"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
                  <TableCell>
                    <Badge variant={sale.status === "completed" ? "success" : "secondary"}>
                      {sale.status === "completed" ? "Concluida" : "Cancelada"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {document ? (
                      document.danfe_url ? (
                        <a
                          href={document.danfe_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4"
                        >
                          <Badge variant={FISCAL_BADGE[document.status].variant}>
                            {FISCAL_BADGE[document.status].label}
                          </Badge>
                        </a>
                      ) : (
                        <Badge variant={FISCAL_BADGE[document.status].variant}>
                          {FISCAL_BADGE[document.status].label}
                        </Badge>
                      )
                    ) : sale.status === "completed" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEmitNfce(sale.id)}
                      >
                        <Receipt className="size-4" />
                        Emitir NFC-e
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {sale.status === "completed" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Cancelar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar venda?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O estoque dos itens sera estornado automaticamente. Essa acao nao
                              pode ser desfeita.
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
