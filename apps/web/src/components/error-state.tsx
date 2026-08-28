import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorState({
  message = "Erro ao carregar os dados.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
