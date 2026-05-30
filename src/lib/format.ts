export function formatBRL(value: number): string {
  return value
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    .replace(/ /g, " ");
}

/** Arredonda para 2 casas, meio pra cima, sem valores negativos. */
export function calcSubtotal(pesoLiquido: number, precoUnitario: number): number {
  if (pesoLiquido <= 0 || precoUnitario <= 0) return 0;
  const bruto = pesoLiquido * precoUnitario;
  return Math.round((bruto + Number.EPSILON) * 100) / 100;
}
