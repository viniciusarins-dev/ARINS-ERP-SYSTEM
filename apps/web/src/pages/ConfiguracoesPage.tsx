import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FiscalConfigCard } from "./FiscalConfigCard";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietario",
  admin: "Administrador",
  staff: "Equipe",
};

interface Member {
  id: string;
  role: string;
  user_id: string;
}

export default function ConfiguracoesPage() {
  const { organization } = useAuth();
  const { data } = useQuery({
    queryKey: ["members"],
    queryFn: () => api.get<{ members: Member[] }>("/api/organizations/members"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuracoes</h1>
        <p className="text-sm text-muted-foreground">Dados da empresa e equipe</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Nome: </span>
            {organization?.name}
          </p>
          <p>
            <span className="text-muted-foreground">Identificador: </span>
            {organization?.slug}
          </p>
        </CardContent>
      </Card>

      <FiscalConfigCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(data?.members ?? []).map((member) => (
            <div key={member.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{member.user_id}</span>
              <Badge variant="outline">{ROLE_LABELS[member.role] ?? member.role}</Badge>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">
            Convite de novos membros ainda nao esta disponivel nesta versao.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
