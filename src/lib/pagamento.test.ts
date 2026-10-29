import { describe, it, expect } from "vitest";
import { normalizarPagamento, dinheiroDe, rotuloPagamento, passaNoFiltro, somarPorForma } from "./pagamento";

describe("normalizarPagamento", () => {
  it("dinheiro zera o valor_pix", () => {
    expect(normalizarPagamento("dinheiro", 50, 100)).toEqual({ forma_pagamento: "dinheiro", valor_pix: 0 });
  });

  it("pix joga todo o total no valor_pix", () => {
    expect(normalizarPagamento("pix", 0, 100)).toEqual({ forma_pagamento: "pix", valor_pix: 100 });
  });

  it("misto dentro do range mantém o valor digitado", () => {
    expect(normalizarPagamento("misto", 40, 100)).toEqual({ forma_pagamento: "misto", valor_pix: 40 });
  });

  it("misto acima do total faz clamp para o total", () => {
    expect(normalizarPagamento("misto", 150, 100)).toEqual({ forma_pagamento: "misto", valor_pix: 100 });
  });

  it("misto negativo vira 0", () => {
    expect(normalizarPagamento("misto", -10, 100)).toEqual({ forma_pagamento: "misto", valor_pix: 0 });
  });

  it("total menor que o pix salvo faz clamp (itens editados)", () => {
    // antes valor_pix era 80; total caiu para 60
    expect(normalizarPagamento("misto", 80, 60)).toEqual({ forma_pagamento: "misto", valor_pix: 60 });
  });

  it("total negativo é tratado como 0", () => {
    expect(normalizarPagamento("pix", 0, -5)).toEqual({ forma_pagamento: "pix", valor_pix: 0 });
  });

  it("arredonda valores quebrados para 2 casas", () => {
    expect(normalizarPagamento("misto", 33.333, 100)).toEqual({ forma_pagamento: "misto", valor_pix: 33.33 });
  });
});

describe("dinheiroDe", () => {
  it("é o resto do total", () => {
    expect(dinheiroDe(100, 40)).toBe(60);
  });
  it("nunca fica negativo", () => {
    expect(dinheiroDe(100, 150)).toBe(0);
  });
});

describe("rotuloPagamento", () => {
  it("dinheiro e pix simples", () => {
    expect(rotuloPagamento("dinheiro", 100, 0)).toBe("Dinheiro");
    expect(rotuloPagamento("pix", 100, 100)).toBe("PIX");
  });
  it("misto mostra a divisão", () => {
    expect(rotuloPagamento("misto", 100, 40)).toBe("Misto · R$ 40,00 pix / R$ 60,00 din");
  });
});

describe("passaNoFiltro", () => {
  it("todos aceita qualquer forma", () => {
    expect(["dinheiro", "pix", "misto"].every((f) => passaNoFiltro(f, "todos"))).toBe(true);
  });
  it("pix pega pix e misto, não dinheiro", () => {
    expect(passaNoFiltro("pix", "pix")).toBe(true);
    expect(passaNoFiltro("misto", "pix")).toBe(true);
    expect(passaNoFiltro("dinheiro", "pix")).toBe(false);
  });
  it("dinheiro pega dinheiro e misto, não pix", () => {
    expect(passaNoFiltro("dinheiro", "dinheiro")).toBe(true);
    expect(passaNoFiltro("misto", "dinheiro")).toBe(true);
    expect(passaNoFiltro("pix", "dinheiro")).toBe(false);
  });
});

describe("somarPorForma", () => {
  it("divide misto pelo valor_pix e ignora canceladas", () => {
    expect(somarPorForma([
      { forma_pagamento: "pix", total: 100, valor_pix: 100, status: "conferida" },
      { forma_pagamento: "dinheiro", total: 50, valor_pix: 0, status: "conferida" },
      { forma_pagamento: "misto", total: 80, valor_pix: 30, status: "conferida" },
      { forma_pagamento: "pix", total: 999, valor_pix: 999, status: "cancelada" },
    ])).toEqual({ pix: 130, dinheiro: 100 });
  });
});
