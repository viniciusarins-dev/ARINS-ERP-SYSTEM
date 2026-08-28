import { Router } from "express";
import multer from "multer";
import { fiscalConfigSchema } from "@arins/shared";

import { requireOrganization } from "../middleware/organization.js";
import {
  createOrUpdateCompany,
  emitNfce,
  FocusNfeError,
  type FocusNfceResult,
} from "../lib/focus-nfe-client.js";

export const fiscalRouter = Router();
fiscalRouter.use(requireOrganization);

// Certificates are small (a few KB) .pfx files; memoryStorage means the
// buffer lives only in this process's RAM for the duration of the request
// and is never written to disk. A generous-but-bounded size limit guards
// against someone uploading something that isn't actually a certificate.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

fiscalRouter.get("/config", async (req, res) => {
  const { data, error } = await req.supabase
    .from("fiscal_configs")
    .select("cnpj, regime_tributario, inscricao_estadual, environment, provider_status, provider_error, updated_at")
    .eq("organization_id", req.organization.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: "Erro ao carregar configuracao fiscal" });
    return;
  }

  res.json({ config: data });
});

fiscalRouter.put("/config", upload.single("certificate"), async (req, res) => {
  const parsed = fiscalConfigSchema.safeParse({
    cnpj: req.body?.cnpj,
    regimeTributario: req.body?.regimeTributario,
    inscricaoEstadual: req.body?.inscricaoEstadual,
    certificatePassword: req.body?.certificatePassword,
  });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Envie o arquivo do certificado (.pfx/.p12)" });
    return;
  }

  if (!process.env.FOCUS_NFE_API_TOKEN) {
    res.status(503).json({ error: "Integracao fiscal ainda nao configurada no servidor" });
    return;
  }

  const certificateBase64 = req.file.buffer.toString("base64");

  try {
    await createOrUpdateCompany({
      cnpj: parsed.data.cnpj,
      regimeTributario: parsed.data.regimeTributario,
      inscricaoEstadual: parsed.data.inscricaoEstadual || undefined,
      certificateBase64,
      certificatePassword: parsed.data.certificatePassword,
    });

    const { error } = await req.supabase.from("fiscal_configs").upsert(
      {
        organization_id: req.organization.id,
        cnpj: parsed.data.cnpj,
        regime_tributario: parsed.data.regimeTributario,
        inscricao_estadual: parsed.data.inscricaoEstadual || null,
        provider_status: "active",
        provider_error: null,
      },
      { onConflict: "organization_id" }
    );

    if (error) {
      res.status(500).json({ error: "Certificado aceito pelo provedor, mas houve erro ao salvar o status" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof FocusNfeError ? summarizeFocusError(err) : "Erro ao validar o certificado";

    await req.supabase.from("fiscal_configs").upsert(
      {
        organization_id: req.organization.id,
        cnpj: parsed.data.cnpj,
        regime_tributario: parsed.data.regimeTributario,
        inscricao_estadual: parsed.data.inscricaoEstadual || null,
        provider_status: "error",
        provider_error: message,
      },
      { onConflict: "organization_id" }
    );

    res.status(422).json({ error: message });
  }
  // certificateBase64 and req.file.buffer go out of scope here and become
  // eligible for garbage collection; nothing above ever persists them.
});

fiscalRouter.get("/documents", async (req, res) => {
  const { data, error } = await req.supabase
    .from("fiscal_documents")
    .select("*")
    .eq("organization_id", req.organization.id)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Erro ao listar documentos fiscais" });
    return;
  }

  res.json({ documents: data });
});

fiscalRouter.post("/sales/:saleId/emit", async (req, res) => {
  const saleId = req.params.saleId;

  if (!process.env.FOCUS_NFE_API_TOKEN) {
    res.status(503).json({ error: "Integracao fiscal ainda nao configurada no servidor" });
    return;
  }

  const { data: config } = await req.supabase
    .from("fiscal_configs")
    .select("cnpj, provider_status")
    .eq("organization_id", req.organization.id)
    .maybeSingle();

  if (!config || config.provider_status !== "active") {
    res.status(422).json({ error: "Configure o certificado fiscal antes de emitir notas" });
    return;
  }

  // Idempotency: fiscal_documents.sale_id is unique, so this either finds
  // nothing (first attempt) or the row from a previous attempt — in which
  // case, if it already succeeded, we return it as-is instead of touching
  // Focus NFe again.
  const { data: existing } = await req.supabase
    .from("fiscal_documents")
    .select("*")
    .eq("sale_id", saleId)
    .maybeSingle();

  if (existing?.status === "authorized" || existing?.status === "processing") {
    res.json({ document: existing });
    return;
  }

  const { data: sale, error: saleError } = await req.supabase
    .from("sales")
    .select("id, organization_id, status, customers(document)")
    .eq("id", saleId)
    .eq("organization_id", req.organization.id)
    .single();

  if (saleError || !sale) {
    res.status(404).json({ error: "Venda nao encontrada" });
    return;
  }

  if (sale.status !== "completed") {
    res.status(422).json({ error: "So e possivel emitir nota para vendas concluidas" });
    return;
  }

  const { data: items } = await req.supabase
    .from("sale_items")
    .select("quantity, unit_price, products(name)")
    .eq("sale_id", saleId);

  if (!items || items.length === 0) {
    res.status(422).json({ error: "Venda sem itens" });
    return;
  }

  const documentId = existing?.id;
  const customer = sale.customers as unknown as { document: string | null } | null;

  const upsertResult = await req.supabase
    .from("fiscal_documents")
    .upsert(
      {
        id: documentId,
        organization_id: req.organization.id,
        sale_id: saleId,
        type: "nfce",
        status: "processing",
        requested_by: req.user.id,
      },
      { onConflict: "sale_id" }
    )
    .select("*")
    .single();

  if (upsertResult.error || !upsertResult.data) {
    res.status(500).json({ error: "Erro ao registrar a emissao" });
    return;
  }

  const document = upsertResult.data;

  try {
    const result = await emitNfce({
      ref: saleId,
      cnpjEmitente: config.cnpj,
      customerDocument: customer?.document,
      items: (items as unknown as { quantity: number; unit_price: number; products: { name: string } | null }[]).map(
        (item) => ({
          description: item.products?.name ?? "Produto",
          quantity: item.quantity,
          unitPrice: item.unit_price,
        })
      ),
    });

    await req.supabase
      .from("fiscal_documents")
      .update(mapFocusResultToRow(result))
      .eq("id", document.id);

    res.json({ document: { ...document, ...mapFocusResultToRow(result) } });
  } catch (err) {
    const message = err instanceof FocusNfeError ? summarizeFocusError(err) : "Erro ao emitir a nota fiscal";

    await req.supabase
      .from("fiscal_documents")
      .update({ status: "rejected", error_message: message })
      .eq("id", document.id);

    res.status(422).json({ error: message });
  }
});

function mapFocusResultToRow(result: FocusNfceResult) {
  const statusMap: Record<FocusNfceResult["status"], "processing" | "authorized" | "rejected" | "cancelled"> = {
    processando_autorizacao: "processing",
    autorizado: "authorized",
    erro_autorizacao: "rejected",
    cancelado: "cancelled",
  };

  return {
    status: statusMap[result.status],
    provider_ref: result.chave_nfe ?? null,
    numero: result.numero ?? null,
    serie: result.serie ?? null,
    chave_acesso: result.chave_nfe ?? null,
    xml_url: result.caminho_xml_nota_fiscal ?? null,
    danfe_url: result.caminho_danfe ?? null,
    error_message: result.mensagem_sefaz ?? null,
  };
}

function summarizeFocusError(err: FocusNfeError): string {
  const body = err.body as { mensagem?: string; erros?: { mensagem: string }[] } | null;
  return body?.mensagem ?? body?.erros?.[0]?.mensagem ?? err.message;
}
