import { describe, it, expect } from "vitest";
import { calcTotalVenda, calcSubtotalVenda } from "@/lib/venda";
import type { ItemCarrinhoVenda } from "@/lib/types";

const item = (peso: number, preco: number): ItemCarrinhoVenda => ({
  material_id: 1, nome: "Cobre", emoji: "🟧", unidade: "kg",
  peso, preco_unitario: preco, subtotal: calcSubtotalVenda(peso, preco),
});

describe("calcSubtotalVenda", () => {
  it("multiplica e arredonda 2 casas", () => {
    expect(calcSubtotalVenda(5, 32)).toBe(160);
    expect(calcSubtotalVenda(1.234, 10)).toBe(12.34);
    expect(calcSubtotalVenda(0.333, 3)).toBe(1.0); // 0.999 → 1.00
  });
});

describe("calcTotalVenda", () => {
  it("soma zero se vazio", () => {
    expect(calcTotalVenda([])).toBe(0);
  });
  it("soma com item único", () => {
    expect(calcTotalVenda([item(10, 32)])).toBe(320);
  });
  it("soma múltiplos itens com arredondamento correto", () => {
    // 5 × 32 = 160, 3.5 × 4.50 = 15.75, 100 × 0.80 = 80 → total = 255.75
    expect(calcTotalVenda([item(5, 32), item(3.5, 4.5), item(100, 0.8)])).toBe(255.75);
  });
});
