import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toaster";
import { useClientView, useData } from "@/data/DataProvider";
import { RepoError } from "@/data/types";
import { ClientForm } from "@/features/clients/ClientForm";

import { NotFound } from "./NotFound";

export function EditClientPage() {
  const { id } = useParams();
  const view = useClientView(id);
  const { today, updateClient } = useData();
  const navigate = useNavigate();
  const toast = useToast();

  if (!view) return <NotFound what="cliente" />;

  return (
    <>
      <PageHeader title="Editar cliente" back={{ to: `/clientes/${view.client.id}`, label: view.client.fullName }} />
      <ClientForm
        key={view.client.id}
        today={today}
        view={view}
        submitLabel="Salvar alterações"
        onCancel={() => navigate(`/clientes/${view.client.id}`)}
        onSubmit={async (input) => {
          try {
            await updateClient(view.client.id, input);
            toast({ title: "Alterações salvas" });
            navigate(`/clientes/${view.client.id}`, { replace: true });
          } catch (e) {
            toast({ title: "Não foi possível salvar", description: e instanceof RepoError ? e.message : undefined, tone: "warning" });
          }
        }}
      />
    </>
  );
}
