import { describe, it, expect } from "vitest";
import { calcTotalCompra } from "@/lib/compra";
import type { ItemCesta } from "@/lib/types";

function item(p: Partial<ItemCesta>): ItemCesta {
  return {
    material_id: 1, nome: "X", emoji: null, unidade: "kg",
    preco_unitario: 0, peso_bruto: 0, peso_liquido: 0, subtotal: 0, ...p,
  };
}

describe("calcTotalCompra", () => {
  it("soma os subtotais com 2 casas", () => {
    const itens = [item({ subtotal: 68.2 }), item({ subtotal: 32 }), item({ subtotal: 0.01 })];
    expect(calcTotalCompra(itens)).toBe(100.21);
  });
  it("cesta vazia => 0", () => {
    expect(calcTotalCompra([])).toBe(0);
  });
});
