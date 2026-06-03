import { describe, it, expect } from "vitest";
import { normalizarNome, buscarCatadores, resolverCatador, type CatadorOpt } from "./catador";

const lista: CatadorOpt[] = [
  { id: 1, nome: "Seu Zé" },
  { id: 2, nome: "Marcão" },
  { id: 3, nome: "João Silva" },
  { id: 4, nome: "João Silva" }, // duplicado de propósito
];

describe("normalizarNome", () => {
  it("remove acentos, baixa caixa e colapsa espaços", () => {
    expect(normalizarNome("  João   Silva ")).toBe("joao silva");
    expect(normalizarNome("MARCÃO")).toBe("marcao");
    expect(normalizarNome("Seu Zé")).toBe("seu ze");
  });
});

describe("buscarCatadores", () => {
  it("retorna vazio para termo vazio", () => {
    expect(buscarCatadores(lista, "")).toEqual([]);
    expect(buscarCatadores(lista, "   ")).toEqual([]);
  });
  it("acha por trecho ignorando acento/caixa", () => {
    expect(buscarCatadores(lista, "joao").map((c) => c.id)).toEqual([3, 4]);
    expect(buscarCatadores(lista, "ZE").map((c) => c.id)).toEqual([1]);
  });
  it("respeita o limite", () => {
    expect(buscarCatadores(lista, "joao", 1)).toHaveLength(1);
  });
});

describe("resolverCatador", () => {
  it("resolve por id quando há um único nome igual (com acento/caixa diferentes)", () => {
    expect(resolverCatador(lista, "marcao")).toEqual({ tipo: "ok", id: 2, nome: "Marcão" });
    expect(resolverCatador(lista, "  SEU zé ")).toEqual({ tipo: "ok", id: 1, nome: "Seu Zé" });
  });
  it("não resolve quando o texto não bate exatamente (evita catador errado)", () => {
    expect(resolverCatador(lista, "mar")).toEqual({ tipo: "nenhum" });
    expect(resolverCatador(lista, "")).toEqual({ tipo: "nenhum" });
  });
  it("acusa ambiguidade quando há nomes duplicados", () => {
    const r = resolverCatador(lista, "João Silva");
    expect(r.tipo).toBe("ambiguo");
    if (r.tipo === "ambiguo") expect(r.opcoes.map((o) => o.id)).toEqual([3, 4]);
  });
});
