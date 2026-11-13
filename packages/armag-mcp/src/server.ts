// Servidor MCP "armag" (stdio): ferramentas de prospecção da ARMAG.
// Cada ferramenta só repassa a chamada ao serviço "bob" — a lógica e as chaves ficam no Supabase.
// Registrado em .mcp.json na raiz do repositório (usa o arquivo empacotado dist/server.mjs).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chamarBob, type Acao } from "./bob-client.ts";

const server = new McpServer({ name: "armag", version: "1.0.0" });

const SEGMENTO = z.enum(["barbearia", "salao"]);
const STATUS = z.enum(["novo", "contatado", "interessado", "proposta", "fechado", "sem_interesse"]);

async function executar(acao: Acao, dados: Record<string, unknown>) {
  try {
    const r = await chamarBob(acao, dados);
    return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }] };
  }
}

server.registerTool(
  "pedido_bob",
  {
    title: "Pedido ao Bob",
    description:
      'Faz o mesmo que falar com o Bob no iPhone: interpreta um pedido em português ("cinco barbearias no Saguaçu"), busca no Google negócios sem site próprio, salva como leads novos e devolve a frase de resposta e os leads criados.',
    inputSchema: { texto: z.string().describe('Pedido em português, ex.: "cinco", "três salões no Centro"') },
  },
  async ({ texto }) => executar("pedido", { texto }),
);

server.registerTool(
  "buscar_prospects",
  {
    title: "Buscar prospects",
    description:
      "Busca no Google Places negócios ativos, sem site próprio, com telefone e ao menos 5 avaliações, que ainda não são leads nem clientes. Não grava nada; use salvar_leads com os itens escolhidos.",
    inputSchema: {
      segmento: SEGMENTO.optional().describe("barbearia ou salao; vazio = os dois"),
      regiao: z.string().optional().describe('Padrão "Joinville SC"; ex.: "Saguaçu, Joinville SC"'),
      quantidade: z.number().int().min(1).max(10).optional().describe("Padrão 5, máximo 10"),
    },
  },
  async (a) => executar("buscar", a),
);

server.registerTool(
  "salvar_leads",
  {
    title: "Salvar leads",
    description: "Grava como leads (status novo) os candidatos devolvidos por buscar_prospects. Ignora quem já existe.",
    inputSchema: { candidatos: z.array(z.record(z.string(), z.unknown())).min(1).max(10) },
  },
  async ({ candidatos }) => executar("salvar", { candidatos }),
);

server.registerTool(
  "mensagem_abordagem",
  {
    title: "Mensagem de abordagem",
    description:
      "Monta a mensagem de apresentação da ARMAG para um lead, o link do WhatsApp com o texto preenchido e diz se o vídeo de 23 s deve ser anexado (barbearias e salões). Não envia nada.",
    inputSchema: { lead_id: z.string() },
  },
  async ({ lead_id }) => executar("mensagem", { lead_id }),
);

server.registerTool(
  "marcar_status",
  {
    title: "Marcar status",
    description: 'Atualiza o status de um ou mais leads (ex.: "contatado" depois que o dono enviou a mensagem). Contatado grava a data de hoje.',
    inputSchema: { lead_ids: z.array(z.string()).min(1), status: STATUS, nota: z.string().optional() },
  },
  async (a) => executar("marcar_status", a),
);

server.registerTool(
  "listar_leads",
  {
    title: "Listar leads",
    description: "Lista os leads mais recentes (opcionalmente de um status) e quantas buscas no Google foram feitas no mês.",
    inputSchema: { status: STATUS.optional(), limite: z.number().int().min(1).max(100).optional() },
  },
  async (a) => executar("listar", a),
);

await server.connect(new StdioServerTransport());
