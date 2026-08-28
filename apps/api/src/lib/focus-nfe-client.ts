import { env } from "../env.js";

/**
 * Thin wrapper around the Focus NFe REST API (https://doc.focusnfe.com.br).
 *
 * IMPORTANT — verify before going live: this was written from Focus NFe's
 * public docs and community examples, not tested against a real account
 * (we don't have an API token yet). Once FOCUS_NFE_API_TOKEN is set, smoke
 * test each method against homologacao.focusnfe.com.br and adjust field
 * names/response shapes here if their current docs differ — this file is
 * the only place that knowledge needs to live.
 *
 * Auth: HTTP Basic with the account token as username and an empty
 * password (their convention, not ours).
 */

export class FocusNfeError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function requireToken(): string {
  if (!env.focusNfeApiToken) {
    throw new Error("FOCUS_NFE_API_TOKEN is not configured");
  }
  return env.focusNfeApiToken;
}

async function focusRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = requireToken();
  const auth = Buffer.from(`${token}:`).toString("base64");

  const res = await fetch(`${env.focusNfeBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const responseBody = await res.json().catch(() => null);

  if (!res.ok) {
    throw new FocusNfeError(
      `Focus NFe respondeu ${res.status}`,
      res.status,
      responseBody
    );
  }

  return responseBody as T;
}

export interface CreateCompanyInput {
  cnpj: string;
  regimeTributario: "simples_nacional" | "lucro_presumido" | "lucro_real";
  inscricaoEstadual?: string;
  certificateBase64: string;
  certificatePassword: string;
}

export interface FocusCompanyResult {
  id: string;
  cnpj: string;
  habilita_nfce: boolean;
  habilita_nfe: boolean;
}

/**
 * Registers (or updates) the organization's company with Focus NFe,
 * including the A1 certificate. The certificate travels in this one
 * request, base64-encoded in the JSON body per their API, and is never
 * written to our disk or database before or after this call.
 */
export async function createOrUpdateCompany(
  input: CreateCompanyInput
): Promise<FocusCompanyResult> {
  return focusRequest<FocusCompanyResult>("POST", "/v2/empresas", {
    cnpj: input.cnpj,
    regime_tributario_id: regimeTributarioId(input.regimeTributario),
    inscricao_estadual: input.inscricaoEstadual,
    habilita_nfce: true,
    arquivo_certificado_base64: input.certificateBase64,
    senha_certificado: input.certificatePassword,
  });
}

function regimeTributarioId(regime: CreateCompanyInput["regimeTributario"]): number {
  // Focus NFe's own numeric codes for regime tributario.
  switch (regime) {
    case "simples_nacional":
      return 1;
    case "lucro_presumido":
      return 3;
    case "lucro_real":
      return 3;
  }
}

export interface EmitNfceInput {
  ref: string; // idempotency key — we pass the sale id
  cnpjEmitente: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  customerDocument?: string | null;
}

export interface FocusNfceResult {
  status: "processando_autorizacao" | "autorizado" | "erro_autorizacao" | "cancelado";
  numero?: string;
  serie?: string;
  chave_nfe?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  mensagem_sefaz?: string;
}

/**
 * Emits an NFC-e for one sale. `ref` is Focus NFe's own idempotency
 * mechanism (documented behavior: POSTing the same ref twice returns the
 * existing document instead of emitting a duplicate) — we set it to our
 * sale id so a retried request can never produce two notes for one sale.
 */
export async function emitNfce(input: EmitNfceInput): Promise<FocusNfceResult> {
  return focusRequest<FocusNfceResult>("POST", `/v2/nfce?ref=${input.ref}`, {
    natureza_operacao: "Venda",
    presenca_comprador: 1,
    cnpj_emitente: input.cnpjEmitente,
    cpf_cnpj_destinatario: input.customerDocument || undefined,
    items: input.items.map((item, index) => ({
      numero_item: index + 1,
      descricao: item.description,
      quantidade_comercial: item.quantity,
      valor_unitario_comercial: item.unitPrice,
    })),
  });
}

export async function getNfceStatus(ref: string): Promise<FocusNfceResult> {
  return focusRequest<FocusNfceResult>("GET", `/v2/nfce/${ref}`);
}
