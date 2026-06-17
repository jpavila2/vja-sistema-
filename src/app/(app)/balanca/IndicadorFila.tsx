"use client";

/**
 * Aviso de compras finalizadas sem internet, aguardando subir. Some quando a
 * fila esvazia. Deixa claro que nada se perdeu e que sobe sozinho.
 */
export function IndicadorFila({ pendentes }: { pendentes: number }) {
  if (pendentes <= 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
      <span className="text-lg">📤</span>
      <span>
        {pendentes} compra{pendentes > 1 ? "s" : ""} aguardando internet — vai subir sozinho.
      </span>
    </div>
  );
}
