import { describe, it, expect } from "vitest";
import { limitesDoDiaBR } from "@/lib/datas";

describe("limitesDoDiaBR", () => {
  it("retorna janela UTC do dia no fuso -03:00", () => {
    const { inicio, fim } = limitesDoDiaBR("2026-05-31");
    expect(inicio).toBe("2026-05-31T03:00:00.000Z");
    expect(fim).toBe("2026-06-01T03:00:00.000Z");
  });
});
