"use client";

import { type Comanda, rotuloComanda } from "@/lib/comandas";

/**
 * Barra das pesagens abertas: um chip por comanda (nome + nº de itens), a ativa
 * destacada, mais o botão "Nova" para abrir outra pesagem em paralelo.
 */
export function BarraComandas({
  comandas,
  ativaId,
  onSelecionar,
  onNova,
}: {
  comandas: Comanda[];
  ativaId: string;
  onSelecionar: (id: string) => void;
  onNova: () => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {comandas.map((c) => {
        const ativa = c.id === ativaId;
        const n = c.cesta.length;
        return (
          <button
            key={c.id}
            onClick={() => onSelecionar(c.id)}
            aria-current={ativa}
            className={
              "flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors " +
              (ativa
                ? "border-marca-teal bg-marca-teal text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
            }
          >
            <span className="max-w-[10rem] truncate">{rotuloComanda(c)}</span>
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs font-black " +
                (ativa ? "bg-white/25" : "bg-slate-100 text-slate-500")
              }
            >
              {n}
            </span>
          </button>
        );
      })}
      <button
        onClick={onNova}
        aria-label="Nova pesagem"
        className="flex shrink-0 items-center gap-1 rounded-full border-2 border-dashed border-marca-teal px-4 py-2 text-sm font-black text-marca-teal-dark hover:bg-marca-teal-light"
      >
        ➕ Nova
      </button>
    </div>
  );
}
