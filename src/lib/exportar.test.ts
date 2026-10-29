import { describe, it, expect } from "vitest";
import { montarCSV, numeroBR } from "./exportar";

const linha = (v: string | number) => montarCSV(["x"], [[v]]).split("\r\n")[1];

describe("montarCSV", () => {
  it("neutraliza texto que viraria fórmula no Excel", () => {
    expect(linha("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(linha("@SOMA")).toBe("'@SOMA");
    expect(linha("-x")).toBe("'-x");
  });
  it("não mexe em números, inclusive negativos do numeroBR", () => {
    expect(linha(numeroBR(-12.5))).toBe("-12,50");
    expect(linha(7)).toBe("7");
  });
  it("aspas e ponto e vírgula continuam escapados", () => {
    expect(linha('a;"b"')).toBe('"a;""b"""');
  });
});
