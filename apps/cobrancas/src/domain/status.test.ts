import { describe, expect, it } from "vitest";

import { aggregateStatus, installmentStatus } from "./status";

const today = "2026-11-04";

describe("installmentStatus", () => {
  it("paga é sempre PAGO, mesmo vencida", () => {
    expect(installmentStatus("2026-10-01", true, today)).toBe("pago");
  });
  it("vencida e não paga é ATRASADO", () => {
    expect(installmentStatus("2026-11-03", false, today)).toBe("atrasado");
  });
  it("vence hoje ou nos próximos 3 dias é PRÓXIMO", () => {
    expect(installmentStatus("2026-11-04", false, today)).toBe("proximo");
    expect(installmentStatus("2026-11-07", false, today)).toBe("proximo");
  });
  it("a partir de 4 dias é EM DIA", () => {
    expect(installmentStatus("2026-11-08", false, today)).toBe("em_dia");
  });
  it("muda sozinho com a data — sem atualização manual", () => {
    expect(installmentStatus("2026-11-10", false, "2026-11-01")).toBe("em_dia");
    expect(installmentStatus("2026-11-10", false, "2026-11-08")).toBe("proximo");
    expect(installmentStatus("2026-11-10", false, "2026-11-11")).toBe("atrasado");
  });
});

describe("aggregateStatus", () => {
  it("prioriza a pior situação", () => {
    expect(aggregateStatus(["em_dia", "atrasado", "proximo"])).toBe("atrasado");
    expect(aggregateStatus(["em_dia", "proximo"])).toBe("proximo");
    expect(aggregateStatus(["em_dia"])).toBe("em_dia");
  });
  it("sem parcelas em aberto é PAGO", () => {
    expect(aggregateStatus([])).toBe("pago");
  });
});
