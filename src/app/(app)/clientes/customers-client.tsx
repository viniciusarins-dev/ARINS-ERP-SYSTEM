"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Search } from "lucide-react";
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
import { CustomerDialog } from "./customer-dialog";
import { toggleCustomerActiveAction } from "./actions";

interface Customer {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
}

export function CustomersClient({
  customers,
  searchQuery,
}: {
  customers: Customer[];
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

  function handleToggleActive(customerId: string, active: boolean) {
    startTransition(async () => {
      await toggleCustomerActiveAction(customerId, active);
      toast.success(active ? "Cliente ativado" : "Cliente desativado");
    });
  }

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
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.document ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.phone ?? "-"}
                </TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
