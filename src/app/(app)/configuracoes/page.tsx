import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietario",
  admin: "Administrador",
  staff: "Equipe",
};

export default async function ConfiguracoesPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("memberships")
    .select("id, role, created_at, user_id")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

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
            {organization.name}
          </p>
          <p>
            <span className="text-muted-foreground">Identificador: </span>
            {organization.slug}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(members ?? []).map((member) => (
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
