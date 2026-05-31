import { describe, it, expect } from "vitest";
import { calcularSaldoCaixa } from "@/lib/caixa-fisico";

describe("calcularSaldoCaixa", () => {
  it("inicial + saques - compras - despesas", () => {
    const r = calcularSaldoCaixa({ saldoInicial: 1000, saques: [500], comprasDinheiro: [98.6, 9], despesas: [120, 30] });
    expect(r.totalSaques).toBe(500);
    expect(r.totalCompras).toBe(107.6);
    expect(r.totalDespesas).toBe(150);
    expect(r.saldoCalculado).toBe(1242.4);
  });
  it("diferenca = contado - calculado", () => {
    const r = calcularSaldoCaixa({ saldoInicial: 0, saques: [], comprasDinheiro: [], despesas: [], contado: 95 });
    expect(r.saldoCalculado).toBe(0);
    expect(r.diferenca).toBe(95);
  });
});
