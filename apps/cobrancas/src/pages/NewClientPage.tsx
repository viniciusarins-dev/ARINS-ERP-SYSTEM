import { useNavigate, useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toaster";
import { useData } from "@/data/DataProvider";
import { RepoError } from "@/data/types";
import { ClientForm } from "@/features/clients/ClientForm";

export function NewClientPage() {
  const { today, createClient } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const valor = Number(params.get("valor"));
  const prefill = {
    fullName: params.get("nome") ?? undefined,
    whatsapp: params.get("whatsapp") ?? undefined,
    projectName: params.get("projeto") ?? undefined,
    totalCents: Number.isInteger(valor) && valor > 0 ? valor : undefined,
  };

  return (
    <>
      <PageHeader title="Novo cliente" back={{ to: "/", label: "Painel" }} description="As parcelas são calculadas automaticamente." />
      <ClientForm
        today={today}
        prefill={prefill}
        submitLabel="Salvar cliente"
        onCancel={() => navigate(-1)}
        onSubmit={async (input) => {
          try {
            const id = await createClient(input);
            toast({
              title: "Cliente cadastrado",
              description: input.schedule.length
                ? `${input.schedule.length} ${input.schedule.length === 1 ? "parcela gerada" : "parcelas geradas"}.`
                : "Projeto quitado na entrada.",
            });
            navigate(`/clientes/${id}`, { replace: true });
          } catch (e) {
            toast({ title: "Não foi possível salvar", description: e instanceof RepoError ? e.message : undefined, tone: "warning" });
          }
        }}
      />
    </>
  );
}
