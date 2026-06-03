import { describe, it, expect } from "vitest";
import { calcularSaldoCaixa } from "@/lib/caixa-fisico";

describe("calcularSaldoCaixa", () => {
  it("inicial + saques - compras - despesas (sem vendas)", () => {
    const r = calcularSaldoCaixa({
      saldoInicial: 1000, saques: [500], comprasDinheiro: [98.6, 9],
      despesas: [120, 30], vendasDinheiro: [],
    });
    expect(r.totalSaques).toBe(500);
    expect(r.totalCompras).toBe(107.6);
    expect(r.totalDespesas).toBe(150);
    expect(r.totalVendas).toBe(0);
    expect(r.saldoCalculado).toBe(1242.4);
  });
  it("soma vendas em dinheiro ao saldo", () => {
    const r = calcularSaldoCaixa({
      saldoInicial: 500, saques: [], comprasDinheiro: [200],
      despesas: [], vendasDinheiro: [350.50, 100],
    });
    expect(r.totalVendas).toBe(450.5);
    // 500 - 200 + 450.50 = 750.50
    expect(r.saldoCalculado).toBe(750.5);
  });
  it("diferenca = contado - calculado", () => {
    const r = calcularSaldoCaixa({
      saldoInicial: 0, saques: [], comprasDinheiro: [],
      despesas: [], vendasDinheiro: [], contado: 95,
    });
    expect(r.saldoCalculado).toBe(0);
    expect(r.diferenca).toBe(95);
  });
  it("diferenca negativa (falta)", () => {
    const r = calcularSaldoCaixa({
      saldoInicial: 1000, saques: [], comprasDinheiro: [],
      despesas: [], vendasDinheiro: [], contado: 950,
    });
    expect(r.diferenca).toBe(-50);
  });
});
