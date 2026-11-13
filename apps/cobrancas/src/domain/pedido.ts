/**
 * O "Bob": entende o pedido falado ("três salões no Saguaçu") e monta a resposta falada.
 * Sem IA — regras simples e previsíveis.
 */
import type { PlaceSegment } from "./places";

export const PADRAO_QUANTIDADE = 5;
export const MAX_QUANTIDADE = 10;
const REGIAO_PADRAO = "Joinville SC";
const CIDADES = ["Joinville", "Araquari", "São Francisco do Sul", "Jaraguá do Sul", "Garuva", "Itapoá", "Barra Velha", "Guaramirim"];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const NUMEROS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
};

const MINUSCULAS = new Set(["de", "do", "da", "dos", "das", "e"]);
const titulo = (s: string) =>
  s.split(/\s+/).filter(Boolean).map((w, i) => (i > 0 && MINUSCULAS.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(" ");

export type Pedido = { quantidade: number; segmentos: PlaceSegment[]; regiao: string };

export function interpretarPedido(texto: string): Pedido {
  const t = semAcento(texto ?? "");
  // região: o que vem depois de "no", "na" ou "em" (no texto original, para manter acentos)
  let regiao = REGIAO_PADRAO;
  const m = (texto ?? "").match(/(?:^|\s)(?:no|na|em)\s+(.+)$/i);
  if (m) {
    const lugar = titulo(m[1].replace(/[.!?,;]+$/g, "").trim());
    const cidade = CIDADES.find((c) => semAcento(c) === semAcento(lugar));
    regiao = cidade ? `${cidade} SC` : `${lugar}, ${REGIAO_PADRAO}`;
  }
  const antes = m ? t.slice(0, t.length - semAcento(m[0]).length) : t;

  let quantidade = PADRAO_QUANTIDADE;
  const dig = antes.match(/\d+/);
  if (dig) quantidade = Number(dig[0]);
  else {
    const palavra = antes.split(/[^a-z]+/).find((w) => w in NUMEROS);
    if (palavra) quantidade = NUMEROS[palavra];
  }
  quantidade = Math.min(MAX_QUANTIDADE, Math.max(1, quantidade));

  const barb = /barbear|barbeir/.test(antes);
  const sal = /salao|saloes|cabeleir/.test(antes);
  const segmentos: PlaceSegment[] = barb && !sal ? ["barbearia"] : sal && !barb ? ["salao"] : ["barbearia", "salao"];
  return { quantidade, segmentos, regiao };
}

/** "Saguaçu, Joinville SC" → "no Saguaçu"; "Joinville SC" → "em Joinville". */
function ondeFalado(regiao: string): string {
  const [primeiro, resto] = regiao.split(", ");
  if (!resto) return `em ${primeiro.replace(/ SC$/, "")}`;
  const p1 = primeiro.split(" ")[0];
  return `${/a$/i.test(p1) ? "na" : "no"} ${primeiro}`;
}

const nomeSegmentos = (s: PlaceSegment[]) =>
  s.length === 2 ? "barbearias e salões" : s[0] === "barbearia" ? "barbearias" : "salões";

export function fraseResultado(r: { pedidos: number; criados: number; segmentos: PlaceSegment[]; regiao: string }): string {
  const onde = ondeFalado(r.regiao);
  if (r.criados === 0) {
    return `Hoje não encontrei ${nomeSegmentos(r.segmentos)} sem site ${onde} que ainda não estejam na sua lista. Tenta outra região, por exemplo: cinco no Centro.`;
  }
  const mensagens = r.criados === 1 ? "a mensagem pronta" : "as mensagens prontas";
  if (r.criados < r.pedidos) return `Só achei ${r.criados} hoje ${onde}. Já deixei ${mensagens}.`;
  return `Pronto! Criei ${r.criados} ${r.criados === 1 ? "lead" : "leads"} de ${nomeSegmentos(r.segmentos)} sem site ${onde} e deixei ${mensagens}.`;
}

export function fraseErro(): string {
  return "Desculpa, não consegui buscar agora. Tenta de novo daqui a pouco.";
}
