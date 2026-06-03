import { formatBRL } from "@/lib/format";

/**
 * Despesas do mês por categoria — barras horizontais ordenadas do maior pro
 * menor. Mostra pra onde o dinheiro está indo. Componente de servidor.
 */
export function GraficoDespesas({
  itens,
}: { itens: { categoria: string; valor: number }[] }) {
  if (itens.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">
        Nenhuma despesa lançada no mês.
      </div>
    );
  }
  const ordenado = [...itens].sort((a, b) => b.valor - a.valor);
  const max = Math.max(...ordenado.map((i) => i.valor), 1);
  const total = ordenado.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-3">
      {ordenado.map((i) => {
        const pct = (i.valor / max) * 100;
        const share = total > 0 ? Math.round((i.valor / total) * 100) : 0;
        return (
          <div key={i.categoria} className="flex items-center gap-3">
            <div className="w-28 shrink-0 truncate text-sm font-semibold text-marca-navy" title={i.categoria}>
              {i.categoria}
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-slate-100">
              <div className="h-full rounded-lg bg-rose-500" style={{ width: `${pct}%`, minWidth: 6 }} />
            </div>
            <div className="w-32 shrink-0 text-right text-sm font-bold text-marca-navy">
              {formatBRL(i.valor)} <span className="font-medium text-slate-400">· {share}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
