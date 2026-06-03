import type { ItemCarrinhoVenda } from "@/lib/types";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Soma os subtotais do carrinho de venda, arredondando para 2 casas. */
export function calcTotalVenda(itens: ItemCarrinhoVenda[]): number {
  return r2(itens.reduce((s, i) => s + i.subtotal, 0));
}

/** Calcula o subtotal de um item: peso × preço, arredondado. */
export function calcSubtotalVenda(peso: number, preco: number): number {
  return r2(peso * preco);
}
