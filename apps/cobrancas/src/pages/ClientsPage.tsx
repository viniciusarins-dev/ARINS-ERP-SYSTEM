import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { useData } from "@/data/DataProvider";
import { ClientList } from "@/features/clients/ClientList";

export function ClientsPage() {
  const { views } = useData();
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Busque pelo nome ou filtre pela situação financeira."
        actions={
          <Link to="/clientes/novo" className={buttonClass("primary", "lg", "max-lg:hidden")}>
            <Plus /> Novo cliente
          </Link>
        }
      />
      <ClientList views={views} />
    </>
  );
}
