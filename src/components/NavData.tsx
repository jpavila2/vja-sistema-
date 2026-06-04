import Link from "next/link";
import { diaAdjacente, dataExtenso, hojeBR } from "@/lib/datas";

/**
 * Navegação de dia com setas (◀ ontem · hoje · amanhã ▶) e a data por extenso.
 * `base` é a rota (ex.: "/escritorio/caixa"); navega via ?dia=YYYY-MM-DD.
 */
export function NavData({ dia, base }: { dia: string; base: string }) {
  const hoje = hojeBR();
  const ehHoje = dia === hoje;
  const link = (d: string) => `${base}?dia=${d}`;
  return (
    <div className="flex items-center gap-1">
      <Link href={link(diaAdjacente(dia, -1))} aria-label="Dia anterior"
        className="rounded-lg border bg-white px-3 py-2 text-lg font-bold text-marca-navy hover:bg-slate-100">◀</Link>
      <div className="min-w-[9rem] rounded-lg border bg-white px-3 py-2 text-center">
        <div className="text-sm font-bold capitalize text-marca-navy">{dataExtenso(dia)}</div>
        {!ehHoje && (
          <Link href={link(hoje)} className="text-xs font-semibold text-marca-teal-dark underline">ir para hoje</Link>
        )}
      </div>
      <Link href={link(diaAdjacente(dia, 1))} aria-label="Próximo dia"
        className="rounded-lg border bg-white px-3 py-2 text-lg font-bold text-marca-navy hover:bg-slate-100">▶</Link>
    </div>
  );
}
