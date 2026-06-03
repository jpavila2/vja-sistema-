const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const soma = (xs: number[]) => r2(xs.reduce((s, x) => s + x, 0));

export type EntradaCaixa = {
  saldoInicial: number;
  saques: number[];
  comprasDinheiro: number[];
  despesas: number[];
  vendasDinheiro: number[];
  contado?: number;
};
export type SaldoCaixa = {
  totalSaques: number;
  totalCompras: number;
  totalDespesas: number;
  totalVendas: number;
  saldoCalculado: number;
  diferenca: number | null;
};

export function calcularSaldoCaixa(e: EntradaCaixa): SaldoCaixa {
  const totalSaques   = soma(e.saques);
  const totalCompras  = soma(e.comprasDinheiro);
  const totalDespesas = soma(e.despesas);
  const totalVendas   = soma(e.vendasDinheiro ?? []);
  const saldoCalculado = r2(
    e.saldoInicial + totalSaques - totalCompras - totalDespesas + totalVendas
  );
  const diferenca = e.contado === undefined ? null : r2(e.contado - saldoCalculado);
  return { totalSaques, totalCompras, totalDespesas, totalVendas, saldoCalculado, diferenca };
}
