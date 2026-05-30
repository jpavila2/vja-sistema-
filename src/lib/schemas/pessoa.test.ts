import { describe, it, expect } from "vitest";
import { pessoaSchema } from "@/lib/schemas/pessoa";

describe("pessoaSchema", () => {
  it("aceita pessoa mínima (só nome e tipo)", () => {
    const r = pessoaSchema.safeParse({ nome: "Seu Zé", tipo: "fornecedor" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("ativo");
  });
  it("rejeita tipo inválido", () => {
    const r = pessoaSchema.safeParse({ nome: "Teste", tipo: "outro" });
    expect(r.success).toBe(false);
  });
  it("rejeita nome curto", () => {
    const r = pessoaSchema.safeParse({ nome: "X", tipo: "cliente" });
    expect(r.success).toBe(false);
  });
});
