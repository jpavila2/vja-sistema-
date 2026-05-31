export type CompraResumo = { total: number; status: string };
export type ResumoCaixa = { totalComprado: number; qtdCompras: number; ticketMedio: number };

export function resumoCaixa(compras: CompraResumo[]): ResumoCaixa {
  const validas = compras.filter((c) => c.status !== "cancelada");
  const totalComprado = Math.round(validas.reduce((s, c) => s + c.total, 0) * 100) / 100;
  const qtdCompras = validas.length;
  const ticketMedio = qtdCompras === 0 ? 0 : Math.round((totalComprado / qtdCompras) * 100) / 100;
  return { totalComprado, qtdCompras, ticketMedio };
}
