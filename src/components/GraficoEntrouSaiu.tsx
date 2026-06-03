import { formatBRL } from "@/lib/format";

/**
 * Entrou × Saiu do mês. "Entrou" = vendas. "Saiu" = compras + despesas
 * (empilhadas), pra deixar claro que despesa também sai do bolso.
 * Componente de servidor: barras em CSS, sem JS no cliente.
 */
export function GraficoEntrouSaiu({
  vendido, comprado, despesas,
}: { vendido: number; comprado: number; despesas: number }) {
  const saiu = comprado + despesas;
  const escala = Math.max(vendido, saiu, 1);
  const pct = (v: number) => `${(v / escala) * 100}%`;

  return (
    <div className="flex items-end justify-around gap-6 px-2" style={{ height: 220 }}>
      {/* Entrou */}
      <Coluna rotulo="Entrou" total={vendido} totalCor="text-marca-green-dark">
        <Segmento titulo="Vendido" valor={vendido} altura={pct(vendido)}
          classe="bg-marca-green" arredondaTopo />
      </Coluna>

      {/* Saiu (empilhado) */}
      <Coluna rotulo="Saiu" total={saiu} totalCor="text-rose-600">
        {despesas > 0 && (
          <Segmento titulo="Despesas" valor={despesas} altura={pct(despesas)}
            classe="bg-rose-500" arredondaTopo />
        )}
        {comprado > 0 && (
          <Segmento titulo="Comprado" valor={comprado} altura={pct(comprado)}
            classe="bg-marca-gold" arredondaTopo={despesas === 0} />
        )}
        {saiu === 0 && <div className="w-full rounded-t-lg bg-slate-200" style={{ height: 4 }} />}
      </Coluna>
    </div>
  );
}

function Coluna({ rotulo, total, totalCor, children }: {
  rotulo: string; total: number; totalCor: string; children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-28 flex-col items-center justify-end">
      <div className={"mb-1 text-base font-black " + totalCor}>{formatBRL(total)}</div>
      <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-lg">
        {children}
      </div>
      <div className="mt-2 text-sm font-bold text-slate-500">{rotulo}</div>
    </div>
  );
}

function Segmento({ titulo, valor, altura, classe, arredondaTopo }: {
  titulo: string; valor: number; altura: string; classe: string; arredondaTopo?: boolean;
}) {
  return (
    <div
      title={`${titulo}: ${formatBRL(valor)}`}
      className={`${classe} ${arredondaTopo ? "rounded-t-lg" : ""} flex items-center justify-center`}
      style={{ height: altura, minHeight: valor > 0 ? 22 : 0 }}
    >
      <span className="px-1 text-center text-[11px] font-bold leading-tight text-white/95">
        {titulo}
      </span>
    </div>
  );
}
