/** Formas de pagamento de uma compra. "misto" = parte dinheiro, parte PIX. */
export type FormaPagamento = "dinheiro" | "pix" | "misto";

/** Arredonda para 2 casas, meio pra cima. */
function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/**
 * Normaliza a forma de pagamento e o valor pago em PIX, a partir do que o
 * operador escolheu/digitou. O dinheiro é sempre derivado (`total - valor_pix`),
 * nunca armazenado.
 *
 * Regras:
 * - dinheiro → valor_pix = 0
 * - pix      → valor_pix = total
 * - misto    → valor_pix = o que foi digitado, com clamp em [0, total]
 *
 * `total` negativo é tratado como 0.
 */
export function normalizarPagamento(
  forma: string,
  pixDigitado: number,
  total: number,
): { forma_pagamento: FormaPagamento; valor_pix: number } {
  const t = Math.max(0, round2(total) || 0);
  if (forma === "pix") return { forma_pagamento: "pix", valor_pix: t };
  if (forma === "misto") {
    const pix = Math.min(Math.max(round2(pixDigitado) || 0, 0), t);
    return { forma_pagamento: "misto", valor_pix: pix };
  }
  return { forma_pagamento: "dinheiro", valor_pix: 0 };
}

/** Quanto foi pago em dinheiro (sempre derivado do total e do valor em PIX). */
export function dinheiroDe(total: number, valorPix: number): number {
  return Math.max(0, round2(total - valorPix));
}

/** Rótulo curto para exibir no card da compra. */
export function rotuloPagamento(forma: string, total: number, valorPix: number): string {
  if (forma === "pix") return "PIX";
  if (forma === "misto") {
    const din = dinheiroDe(total, valorPix);
    const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `Misto · R$ ${fmt(valorPix)} pix / R$ ${fmt(din)} din`;
  }
  return "Dinheiro";
}

/** Filtro de pagamento das telas/exportação. "misto" entra nos dois lados. */
export type FiltroPagamento = "todos" | "dinheiro" | "pix";

/** A compra tem alguma parte paga nessa forma? (misto conta em PIX e em dinheiro) */
export function passaNoFiltro(forma: string, filtro: FiltroPagamento): boolean {
  if (filtro === "todos") return true;
  if (filtro === "pix") return forma === "pix" || forma === "misto";
  return forma !== "pix"; // dinheiro, misto (e formas antigas tratadas como gaveta)
}

/**
 * Soma quanto saiu em PIX e em dinheiro num conjunto de compras.
 * Compras canceladas ficam de fora; misto é dividido pelo valor_pix.
 */
export function somarPorForma(
  compras: { forma_pagamento: string; total: number; valor_pix: number; status: string }[],
): { pix: number; dinheiro: number } {
  let pix = 0;
  let dinheiro = 0;
  for (const c of compras) {
    if (c.status === "cancelada") continue;
    const total = Number(c.total);
    const vPix = c.forma_pagamento === "pix" ? total : c.forma_pagamento === "misto" ? Number(c.valor_pix) : 0;
    pix += vPix;
    dinheiro += dinheiroDe(total, vPix);
  }
  return { pix: round2(pix), dinheiro: round2(dinheiro) };
}
