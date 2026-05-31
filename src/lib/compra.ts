import type { ItemCesta } from "@/lib/types";

/** Soma os subtotais da cesta, arredondando o total para 2 casas. */
export function calcTotalCompra(itens: ItemCesta[]): number {
  const total = itens.reduce((s, i) => s + i.subtotal, 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}
