// DDDs válidos no Brasil (Anatel).
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46,
  47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85,
  86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Normaliza para "DDD + número" (10 ou 11 dígitos). Aceita entradas com
 * máscara, com +55 ou com 0 de longa distância.
 */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export type PhoneValidation = { ok: true; national: string } | { ok: false; error: string };

export function validatePhone(input: string): PhoneValidation {
  const national = normalizePhone(input);
  if (!national) return { ok: false, error: "Informe o WhatsApp com DDD." };
  if (national.length !== 10 && national.length !== 11) {
    return { ok: false, error: "Número incompleto. Use DDD + número, ex.: (11) 98765-4321." };
  }
  if (!VALID_DDDS.has(Number(national.slice(0, 2)))) return { ok: false, error: "DDD inválido." };
  if (national.length === 11 && national[2] !== "9") {
    return { ok: false, error: "Celular deve começar com 9 depois do DDD." };
  }
  return { ok: true, national };
}

/** (11) 98765-4321 · (11) 3456-7890 */
export function formatPhone(national: string): string {
  const d = national.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return national;
}

/** Máscara progressiva enquanto o usuário digita. */
export function maskPhoneInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Link oficial do WhatsApp (wa.me) com a mensagem preenchida. */
export function whatsappLink(national: string, text: string): string {
  return `https://wa.me/55${national}?text=${encodeURIComponent(text)}`;
}
