/**
 * Orçamentos: catálogo de itens prontos + tópicos livres → horas, valor e prazo.
 * As horas de cada item são estimativas editáveis no catálogo abaixo.
 */

export type ToggleItem = { kind: "toggle"; id: string; label: string; hours: number; hint?: string };
export type SelectItem = {
  kind: "select";
  id: string;
  label: string;
  options: { value: string; label: string; hours: number }[];
  hint?: string;
};
export type QuantityItem = {
  kind: "quantity";
  id: string;
  label: string;
  hoursPerUnit: number;
  unit: string;
  max?: number;
  hint?: string;
};
export type CatalogItem = ToggleItem | SelectItem | QuantityItem;
export type CatalogGroup = { id: string; title: string; items: CatalogItem[] };

export const BUDGET_CATALOG: CatalogGroup[] = [
  {
    id: "base",
    title: "Base do projeto",
    items: [
      { kind: "toggle", id: "setup", label: "Configuração, hospedagem e publicação", hours: 4 },
      { kind: "toggle", id: "responsive", label: "Layout responsivo (celular e tablet)", hours: 6 },
      { kind: "quantity", id: "pages", label: "Páginas / telas", hoursPerUnit: 3, unit: "página", max: 60 },
      { kind: "toggle", id: "design", label: "Design personalizado (protótipo antes de programar)", hours: 8 },
    ],
  },
  {
    id: "auth",
    title: "Login e usuários",
    items: [
      {
        kind: "select",
        id: "login",
        label: "Sistema de login",
        options: [
          { value: "nao", label: "Não", hours: 0 },
          { value: "1", label: "1 tipo de usuário", hours: 8 },
          { value: "2", label: "2 tipos", hours: 14 },
          { value: "3", label: "3 ou mais tipos", hours: 20 },
        ],
        hint: "Ex.: administrador, cliente, funcionário",
      },
      { kind: "toggle", id: "reset", label: "Recuperação de senha por e-mail", hours: 3 },
      { kind: "toggle", id: "google", label: "Login com Google", hours: 4 },
      { kind: "toggle", id: "permissions", label: "Permissões por tipo de usuário", hours: 6 },
    ],
  },
  {
    id: "system",
    title: "Funcionalidades do sistema",
    items: [
      { kind: "toggle", id: "admin", label: "Painel administrativo", hours: 16 },
      { kind: "quantity", id: "crud", label: "Cadastros (listar, criar, editar, excluir)", hoursPerUnit: 4, unit: "cadastro", max: 40 },
      { kind: "toggle", id: "dashboard", label: "Dashboard com indicadores e gráficos", hours: 8 },
      { kind: "toggle", id: "reports", label: "Relatórios com filtros", hours: 6 },
      { kind: "toggle", id: "export", label: "Exportação em PDF / Excel", hours: 6 },
      { kind: "toggle", id: "upload", label: "Upload de arquivos e imagens", hours: 5 },
      { kind: "toggle", id: "notifications", label: "Notificações / alertas", hours: 6 },
    ],
  },
  {
    id: "integrations",
    title: "Integrações",
    items: [
      { kind: "toggle", id: "payments", label: "Pagamento online (PIX / cartão)", hours: 12 },
      { kind: "toggle", id: "whatsapp", label: "WhatsApp (botões e mensagens prontas)", hours: 3 },
      { kind: "toggle", id: "email", label: "Envio de e-mails automáticos", hours: 4 },
      { kind: "quantity", id: "api", label: "Integração com API externa", hoursPerUnit: 6, unit: "API", max: 20 },
    ],
  },
  {
    id: "site",
    title: "Site e divulgação",
    items: [
      { kind: "toggle", id: "contact", label: "Formulário de contato", hours: 2 },
      { kind: "toggle", id: "blog", label: "Blog / notícias", hours: 8 },
      { kind: "toggle", id: "seo", label: "SEO básico (Google)", hours: 4 },
      { kind: "toggle", id: "analytics", label: "Google Analytics / métricas", hours: 1 },
      { kind: "toggle", id: "i18n", label: "Site em mais de um idioma", hours: 8 },
    ],
  },
];

/** Respostas do catálogo: toggle → boolean, select → valor, quantity → número. */
export type BudgetSelections = Record<string, boolean | string | number>;
export type CustomTopic = { id: string; label: string; hours: number };

export type BudgetSettings = {
  /** valor da hora em centavos */
  hourlyRateCents: number;
  /** horas de trabalho por dia, para o prazo */
  hoursPerDay: number;
  /** margem para imprevistos, em % sobre as horas */
  marginPercent: number;
};

export const DEFAULT_BUDGET_SETTINGS: BudgetSettings = { hourlyRateCents: 10000, hoursPerDay: 6, marginPercent: 0 };

export type BudgetLine = { id: string; label: string; detail?: string; hours: number };

export type BudgetResult = {
  lines: BudgetLine[];
  baseHours: number;
  marginHours: number;
  totalHours: number;
  totalCents: number;
  workDays: number;
};

/** Arredonda para cima, de meia em meia hora (estimativa nunca fica abaixo do calculado). */
const roundHalf = (h: number) => (h <= 0 ? 0 : Math.ceil(h * 2 - 1e-9) / 2);

/** Converte as escolhas em linhas com horas. */
export function budgetLines(selections: BudgetSelections, topics: CustomTopic[]): BudgetLine[] {
  const lines: BudgetLine[] = [];
  for (const group of BUDGET_CATALOG) {
    for (const item of group.items) {
      const v = selections[item.id];
      if (item.kind === "toggle" && v === true) {
        lines.push({ id: item.id, label: item.label, hours: item.hours });
      } else if (item.kind === "select" && typeof v === "string") {
        const opt = item.options.find((o) => o.value === v);
        if (opt && opt.hours > 0) lines.push({ id: item.id, label: item.label, detail: opt.label, hours: opt.hours });
      } else if (item.kind === "quantity" && typeof v === "number" && v > 0) {
        lines.push({
          id: item.id,
          label: item.label,
          detail: `${v} ${item.unit}${v > 1 ? "s" : ""} × ${item.hoursPerUnit}h`,
          hours: v * item.hoursPerUnit,
        });
      }
    }
  }
  for (const t of topics) {
    if (t.label.trim() && t.hours > 0) lines.push({ id: t.id, label: t.label.trim(), hours: t.hours });
  }
  return lines;
}

export function calculateBudget(
  selections: BudgetSelections,
  topics: CustomTopic[],
  settings: BudgetSettings = DEFAULT_BUDGET_SETTINGS,
): BudgetResult {
  const lines = budgetLines(selections, topics);
  const baseHours = lines.reduce((s, l) => s + l.hours, 0);
  const totalHours = roundHalf(baseHours * (1 + Math.max(0, settings.marginPercent) / 100));
  const hpd = settings.hoursPerDay > 0 ? settings.hoursPerDay : 6;
  return {
    lines,
    baseHours,
    marginHours: totalHours - baseHours,
    totalHours,
    totalCents: Math.round(totalHours * settings.hourlyRateCents),
    workDays: totalHours > 0 ? Math.ceil(totalHours / hpd) : 0,
  };
}

/** "12 dias úteis (~2,5 semanas)" */
export function describeDuration(workDays: number): string {
  if (workDays <= 0) return "—";
  const d = `${workDays} dia${workDays > 1 ? "s" : ""} út${workDays > 1 ? "eis" : "il"}`;
  if (workDays < 5) return d;
  const weeks = Math.round((workDays / 5) * 2) / 2;
  return `${d} (~${String(weeks).replace(".", ",")} semana${weeks > 1 ? "s" : ""})`;
}

/** Valores padrão do formulário: base marcada, login "Não". */
export function defaultSelections(): BudgetSelections {
  return { setup: true, responsive: true, pages: 1, login: "nao", crud: 0, api: 0 };
}

/** Texto para enviar ao cliente: itens incluídos, prazo e investimento (sem as horas internas). */
export function budgetClientMessage(params: {
  title: string;
  clientName?: string | null;
  result: BudgetResult;
  formatMoney: (cents: number) => string;
}): string {
  const first = params.clientName?.trim().split(/\s+/)[0];
  const items = params.result.lines.map((l) => `• ${l.label}${l.detail && !l.detail.includes("×") ? ` (${l.detail})` : l.detail ? ` (${l.detail.split(" ×")[0]})` : ""}`);
  return [
    `Olá${first ? `, ${first}` : ""}! Tudo bem?`,
    `Segue o orçamento do projeto ${params.title.trim()}:`,
    ["O que está incluído:", ...items].join("\n"),
    `Prazo estimado: ${describeDuration(params.result.workDays)}\nInvestimento: ${params.formatMoney(params.result.totalCents).replace(/\u00a0/g, " ")}`,
    "Qualquer dúvida, estou à disposição!",
  ].join("\n\n");
}
