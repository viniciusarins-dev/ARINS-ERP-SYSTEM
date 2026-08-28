import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
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
import type { Customer } from "@/lib/types";
import { CustomerDialog } from "./CustomerDialog";

const COLUMN_COUNT = 6;

export default function ClientesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(initialQuery);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["customers", initialQuery],
    queryFn: () =>
      api.get<{ customers: Customer[] }>(
        `/api/customers${initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : ""}`
      ),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) params.set("q", search);
    else params.delete("q");
    setSearchParams(params);
  }

  async function handleToggleActive(customerId: string, active: boolean) {
    try {
      await api.patch(`/api/customers/${customerId}/active`, { active });
      toast.success(active ? "Cliente ativado" : "Cliente desativado");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar cliente");
    }
  }

  const customers = data?.customers ?? [];
  const hasSearch = Boolean(initialQuery);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro de clientes</p>
        </div>
        <CustomerDialog />
      </div>

      <form onSubmit={handleSearch} className="flex max-w-sm gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, documento ou telefone..."
        />
        <button type="submit" className="sr-only">
          Buscar
        </button>
        <Search className="mt-2 size-4 shrink-0 text-muted-foreground" />
      </form>

      <div className="rounded-xl border bg-card">
        {isError ? (
          <ErrorState message="Nao foi possivel carregar os clientes." onRetry={() => refetch()} />
        ) : !isLoading && customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasSearch ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            description={
              hasSearch
                ? "Tente buscar por outro nome, documento ou telefone."
                : "Cadastre o primeiro cliente pra comecar a vincular vendas a ele."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-16 text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columns={COLUMN_COUNT} />
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.document ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.email ?? "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={customer.active}
                        onCheckedChange={(checked) => handleToggleActive(customer.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <CustomerDialog
                        customer={customer}
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
