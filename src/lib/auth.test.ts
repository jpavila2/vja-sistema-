import { describe, it, expect } from "vitest";
import { rotaPermitida, type Papel } from "@/lib/auth";

const casos: [Papel, string, boolean][] = [
  ["admin", "/", true],
  ["admin", "/escritorio", true],
  ["admin", "/balanca", true],
  ["escritorio", "/", false],
  ["escritorio", "/escritorio", true],
  ["escritorio", "/balanca", true],
  ["balanca", "/", false],
  ["balanca", "/escritorio", false],
  ["balanca", "/balanca", true],
  // exportação de CSV e afins: escritório e admin sim, balança não
  ["admin", "/api/exportar", true],
  ["escritorio", "/api/exportar", true],
  ["balanca", "/api/exportar", false],
];

describe("rotaPermitida", () => {
  for (const [papel, rota, esperado] of casos) {
    it(`${papel} em ${rota} => ${esperado}`, () => {
      expect(rotaPermitida(papel, rota)).toBe(esperado);
    });
  }
});
