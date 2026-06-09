import type { ItemCesta } from "@/lib/types";

/** Soma os subtotais da cesta, arredondando o total para 2 casas. */
export function calcTotalCompra(itens: ItemCesta[]): number {
  const total = itens.reduce((s, i) => s + i.subtotal, 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

/**
 * Peso líquido a partir do bruto: tira primeiro o peso das embalagens (bags)
 * e depois aplica a impureza (%) sobre o que sobra.
 *   líquido = (bruto − bags × kgPorBag) × (1 − impurezaPct/100)
 * Nunca retorna negativo; arredonda para 3 casas.
 */
export function pesoLiquido(
  bruto: number,
  bags: number,
  kgPorBag: number,
  impurezaPct: number
): number {
  const descontoBag = Math.max(0, bags) * Math.max(0, kgPorBag);
  const semBag = Math.max(0, bruto - descontoBag);
  const liquido = semBag * (1 - Math.min(100, Math.max(0, impurezaPct)) / 100);
  return Math.round((liquido + Number.EPSILON) * 1000) / 1000;
}
