import { ArrowLeft, FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";

import { usePageTitle } from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";

export function NotFound({ what = "página" }: { what?: string }) {
  usePageTitle("Não encontrado");
  return (
    <Panel title="Erro 404" className="mx-auto mt-6 max-w-lg">
      <EmptyState
        icon={<FileQuestion />}
        title={`${what[0].toUpperCase()}${what.slice(1)} não encontrad${what === "cliente" ? "o" : "a"}`}
        description="O endereço pode estar incorreto ou o registro foi excluído."
        action={
          <Link to="/" className={buttonClass("secondary")}>
            <ArrowLeft /> Voltar ao painel
          </Link>
        }
      />
    </Panel>
  );
}
