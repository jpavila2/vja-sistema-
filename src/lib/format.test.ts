import { describe, it, expect } from "vitest";
import { formatBRL, calcSubtotal } from "@/lib/format";

describe("formatBRL", () => {
  it("formata em reais", () => {
    expect(formatBRL(68.2)).toBe("R$ 68,20");
    expect(formatBRL(0)).toBe("R$ 0,00");
    expect(formatBRL(1234.5)).toBe("R$ 1.234,50");
  });
});

describe("calcSubtotal", () => {
  it("multiplica peso por preço com 2 casas (meio pra cima)", () => {
    expect(calcSubtotal(12.4, 5.5)).toBe(68.2);
    expect(calcSubtotal(0.001, 0.005)).toBe(0);
    expect(calcSubtotal(1.005, 1)).toBe(1.01);
  });
  it("nunca retorna negativo", () => {
    expect(calcSubtotal(-1, 5)).toBe(0);
  });
});
