import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";

interface FiscalConfig {
  cnpj: string;
  regime_tributario: "simples_nacional" | "lucro_presumido" | "lucro_real";
  inscricao_estadual: string | null;
  environment: "homologacao" | "producao";
  provider_status: "pending" | "active" | "error";
  provider_error: string | null;
  updated_at: string;
}

const REGIME_LABELS: Record<FiscalConfig["regime_tributario"], string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

const STATUS_BADGE: Record<FiscalConfig["provider_status"], { label: string; variant: "success" | "warning" | "destructive" }> = {
  active: { label: "Ativo", variant: "success" },
  pending: { label: "Nao configurado", variant: "warning" },
  error: { label: "Erro", variant: "destructive" },
};

export function FiscalConfigCard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["fiscal-config"],
    queryFn: () => api.get<{ config: FiscalConfig | null }>("/api/fiscal/config"),
  });

  const [cnpj, setCnpj] = useState("");
  const [regime, setRegime] = useState<FiscalConfig["regime_tributario"]>("simples_nacional");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [certificatePassword, setCertificatePassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const file = fileInputRef.current?.files?.[0];
      if (!file) throw new Error("Selecione o arquivo do certificado (.pfx ou .p12)");

      const formData = new FormData();
      formData.append("cnpj", cnpj);
      formData.append("regimeTributario", regime);
      formData.append("inscricaoEstadual", inscricaoEstadual);
      formData.append("certificatePassword", certificatePassword);
      formData.append("certificate", file);

      return api.putForm("/api/fiscal/config", formData);
    },
    onSuccess: () => {
      toast.success("Configuracao fiscal salva");
      setCertificatePassword("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["fiscal-config"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar configuracao fiscal");
    },
  });

  const config = data?.config;
  const status = STATUS_BADGE[config?.provider_status ?? "pending"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Fiscal (NF-e / NFC-e)</CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <CardDescription>
          O certificado digital nunca fica salvo no nosso banco — ele e enviado direto pro
          provedor fiscal (Focus NFe) e descartado da memoria do servidor assim que a
          configuracao e confirmada.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {config && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">CNPJ atual: </span>
              {config.cnpj}
            </p>
            <p>
              <span className="text-muted-foreground">Regime: </span>
              {REGIME_LABELS[config.regime_tributario]}
            </p>
            <p>
              <span className="text-muted-foreground">Ambiente: </span>
              {config.environment === "producao" ? "Producao" : "Homologacao (testes)"}
            </p>
            {config.provider_error && (
              <p className="mt-1 text-destructive">{config.provider_error}</p>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="regime">Regime tributario</Label>
              <Select value={regime} onValueChange={(v) => setRegime(v as typeof regime)}>
                <SelectTrigger id="regime" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="inscricaoEstadual">Inscricao estadual (opcional)</Label>
            <Input
              id="inscricaoEstadual"
              value={inscricaoEstadual}
              onChange={(e) => setInscricaoEstadual(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="certificate">Certificado digital (.pfx/.p12)</Label>
              <Input id="certificate" type="file" accept=".pfx,.p12" ref={fileInputRef} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="certificatePassword">Senha do certificado</Label>
              <Input
                id="certificatePassword"
                type="password"
                value={certificatePassword}
                onChange={(e) => setCertificatePassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={mutation.isPending} className="self-start">
            {mutation.isPending ? "Enviando..." : "Salvar configuracao fiscal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
