import { Router } from "express";

import { env } from "../env.js";
import { createServiceClient } from "../supabase.js";

export const fiscalWebhookRouter = Router();

/**
 * Focus NFe calls this directly — there is no Supabase session to scope a
 * client to, so this is the one route in the API that uses the service
 * role (see supabase.ts createServiceClient). Authenticity is instead
 * checked with a secret embedded in the URL itself (set this same URL,
 * https://<api-host>/api/fiscal/webhooks/focus-nfe/<FOCUS_NFE_WEBHOOK_SECRET>,
 * as the webhook target in the Focus NFe dashboard) — anyone who doesn't
 * know the secret gets a 404, not a hint that the route exists.
 *
 * IMPORTANT — verify before going live: the exact payload shape (field
 * names for ref/status) should be confirmed against a real webhook
 * delivery once fiscal is wired up to a live Focus NFe account; adjust the
 * mapping below if needed.
 */
fiscalWebhookRouter.post("/:secret", async (req, res) => {
  if (!env.focusNfeWebhookSecret || req.params.secret !== env.focusNfeWebhookSecret) {
    res.status(404).end();
    return;
  }

  const payload = req.body as {
    ref?: string;
    status?: string;
    numero?: string;
    serie?: string;
    chave_nfe?: string;
    caminho_xml_nota_fiscal?: string;
    caminho_danfe?: string;
    mensagem_sefaz?: string;
  };

  const saleId = payload.ref;
  if (!saleId) {
    res.status(400).json({ error: "Payload sem ref" });
    return;
  }

  const statusMap: Record<string, "processing" | "authorized" | "rejected" | "cancelled"> = {
    processando_autorizacao: "processing",
    autorizado: "authorized",
    erro_autorizacao: "rejected",
    cancelado: "cancelled",
  };
  const status = payload.status ? statusMap[payload.status] : undefined;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("fiscal_documents")
    .update({
      ...(status ? { status } : {}),
      provider_ref: payload.chave_nfe ?? undefined,
      numero: payload.numero ?? undefined,
      serie: payload.serie ?? undefined,
      chave_acesso: payload.chave_nfe ?? undefined,
      xml_url: payload.caminho_xml_nota_fiscal ?? undefined,
      danfe_url: payload.caminho_danfe ?? undefined,
      error_message: payload.mensagem_sefaz ?? undefined,
    })
    .eq("sale_id", saleId);

  if (error) {
    res.status(500).end();
    return;
  }

  res.status(200).end();
});
