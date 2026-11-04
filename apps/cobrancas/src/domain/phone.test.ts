import { describe, expect, it } from "vitest";

import { formatPhone, maskPhoneInput, normalizePhone, validatePhone, whatsappLink } from "./phone";

describe("telefone", () => {
  it("normaliza máscaras, +55 e 0 de longa distância", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("11987654321");
    expect(normalizePhone("+55 11 98765-4321")).toBe("11987654321");
    expect(normalizePhone("011987654321")).toBe("11987654321");
    expect(normalizePhone("5511987654321")).toBe("11987654321");
  });

  it("valida celular, fixo, DDD e tamanho", () => {
    expect(validatePhone("(11) 98765-4321")).toEqual({ ok: true, national: "11987654321" });
    expect(validatePhone("(21) 3456-7890")).toEqual({ ok: true, national: "2134567890" });
    expect(validatePhone("(20) 98765-4321").ok).toBe(false); // DDD inexistente
    expect(validatePhone("(11) 88765-4321").ok).toBe(false); // celular sem 9
    expect(validatePhone("98765-4321").ok).toBe(false); // sem DDD
    expect(validatePhone("").ok).toBe(false);
  });

  it("formata e aplica máscara progressiva", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("2134567890")).toBe("(21) 3456-7890");
    expect(maskPhoneInput("1")).toBe("(1");
    expect(maskPhoneInput("119876")).toBe("(11) 9876");
    expect(maskPhoneInput("1198765432")).toBe("(11) 9876-5432");
    expect(maskPhoneInput("11987654321999")).toBe("(11) 98765-4321");
  });

  it("gera link oficial wa.me com texto codificado", () => {
    expect(whatsappLink("11987654321", "Olá, João! R$ 500,00")).toBe(
      "https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Jo%C3%A3o!%20R%24%20500%2C00",
    );
  });
});
