import { describe, it, expect } from "vitest";
import { materialSchema } from "@/lib/schemas/material";

describe("materialSchema", () => {
  it("aceita material válido e coage números", () => {
    const r = materialSchema.safeParse({
      nome: "Alumínio", categoria: "metal", unidade: "kg",
      preco_compra: "5.50", estoque_minimo: "10", emoji: "🪙",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.preco_compra).toBe(5.5);
      expect(r.data.estoque_minimo).toBe(10);
    }
  });
  it("rejeita nome curto", () => {
    const r = materialSchema.safeParse({ nome: "A", categoria: "metal", unidade: "kg", preco_compra: "1" });
    expect(r.success).toBe(false);
  });
  it("rejeita categoria inválida", () => {
    const r = materialSchema.safeParse({ nome: "Teste", categoria: "xyz", unidade: "kg", preco_compra: "1" });
    expect(r.success).toBe(false);
  });
  it("rejeita preço negativo", () => {
    const r = materialSchema.safeParse({ nome: "Teste", categoria: "metal", unidade: "kg", preco_compra: "-1" });
    expect(r.success).toBe(false);
  });
});
