import { ServerCrash } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";

/** Build de produção sem as variáveis do Supabase: falha visível, nunca silenciosa. */
export function MisconfiguredPage() {
  return (
    <div className="grid min-h-dvh place-items-center p-5">
      <Panel title="Configuração" code="env" className="w-full max-w-lg">
        <EmptyState
          icon={<ServerCrash />}
          title="Supabase não configurado"
          description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel e publique novamente."
        />
      </Panel>
    </div>
  );
}
