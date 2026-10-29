/**
 * Geração de CSV para o Excel brasileiro: separador ";" e decimal com vírgula.
 * O BOM (﻿) faz o Excel abrir os acentos corretamente.
 */

/** Número no formato brasileiro (vírgula decimal, sem separador de milhar). */
export function numeroBR(n: number, casas = 2): string {
  return n.toFixed(casas).replace(".", ",");
}

function celula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);
  // texto digitado começando com = + - @ vira fórmula no Excel: neutraliza com '
  // (números do numeroBR, inclusive negativos, passam intactos)
  if (typeof valor === "string" && /^[=+\-@\t\r]/.test(texto) && !/^-?\d+(,\d+)?$/.test(texto)) texto = "'" + texto;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function montarCSV(cabecalho: string[], linhas: (string | number | null)[][]): string {
  const corpo = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  return "﻿" + corpo + "\r\n";
}

/** Nome do material precisa de classificação posterior pela empresa compradora. */
export function precisaClassificar(nome: string | null | undefined): boolean {
  return (nome ?? "").toLowerCase().includes("classificar");
}
