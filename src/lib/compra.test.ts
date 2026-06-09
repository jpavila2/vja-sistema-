import { describe, it, expect } from "vitest";
import { calcTotalCompra, pesoLiquido } from "@/lib/compra";
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

describe("pesoLiquido", () => {
  it("sem bag e sem impureza => bruto", () => {
    expect(pesoLiquido(100, 0, 3, 0)).toBe(100);
  });
  it("desconta bags pelo kg/bag", () => {
    expect(pesoLiquido(100, 3, 3, 0)).toBe(91); // 100 - 9
  });
  it("kg por bag editável", () => {
    expect(pesoLiquido(100, 2, 5, 0)).toBe(90); // 100 - 10
  });
  it("aplica impureza depois dos bags", () => {
    expect(pesoLiquido(100, 3, 3, 10)).toBe(81.9); // (100-9)*0.9
  });
  it("nunca fica negativo", () => {
    expect(pesoLiquido(5, 3, 3, 0)).toBe(0); // 5 - 9 -> 0
  });
  it("ignora valores negativos de entrada", () => {
    expect(pesoLiquido(100, -2, 3, -5)).toBe(100);
  });
});
