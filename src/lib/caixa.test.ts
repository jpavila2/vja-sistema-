import { describe, it, expect } from "vitest";
import { resumoCaixa } from "@/lib/caixa";

describe("resumoCaixa", () => {
  it("agrega só as não-canceladas", () => {
    const r = resumoCaixa([
      { total: 100, status: "pendente" },
      { total: 50, status: "conferida" },
      { total: 999, status: "cancelada" },
    ]);
    expect(r.totalComprado).toBe(150);
    expect(r.qtdCompras).toBe(2);
    expect(r.ticketMedio).toBe(75);
  });
  it("vazio => zeros", () => {
    const r = resumoCaixa([]);
    expect(r).toEqual({ totalComprado: 0, qtdCompras: 0, ticketMedio: 0 });
  });
});
