import { formatBRL } from "@/lib/format";

export type ItemBarra = { rotulo: string; valor: number };

/**
 * Ranking em barras horizontais (maior → menor), com valor e % do total.
 * Componente de servidor, sem JS no cliente. `cor` é uma classe bg-* do Tailwind.
 */
export function BarrasHorizontais({
  itens, cor = "bg-marca-teal", max: maxProp, vazio = "Sem dados.",
}: { itens: ItemBarra[]; cor?: string; max?: number; vazio?: string }) {
  if (itens.length === 0) {
    return <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">{vazio}</div>;
  }
  const ordenado = [...itens].sort((a, b) => b.valor - a.valor);
  const max = maxProp ?? Math.max(...ordenado.map((i) => i.valor), 1);
  const total = ordenado.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-2.5">
      {ordenado.map((i) => {
        const pct = (i.valor / max) * 100;
        const share = total > 0 ? Math.round((i.valor / total) * 100) : 0;
        return (
          <div key={i.rotulo} className="flex items-center gap-3">
            <div className="w-32 shrink-0 truncate text-sm font-semibold text-marca-navy" title={i.rotulo}>
              {i.rotulo}
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-slate-100">
              <div className={`h-full rounded-lg ${cor}`} style={{ width: `${pct}%`, minWidth: 6 }} />
            </div>
            <div className="w-36 shrink-0 text-right text-sm font-bold text-marca-navy">
              {formatBRL(i.valor)} <span className="font-medium text-slate-400">· {share}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
