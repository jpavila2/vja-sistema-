import { numeroBR, precisaClassificar } from "@/lib/exportar";

type ItemResumo = {
  peso?: number | string;
  peso_liquido?: number | string;
  materials?: { nome: string; emoji: string | null; unidade: string } | null;
};

/**
 * Linha com os materiais de uma venda/compra, ex.: "♻️ PET 120 kg · 🔩 Sucata 80 kg".
 * Material que ainda precisa de classificação pela empresa aparece destacado em âmbar.
 */
export function ResumoMateriais({ itens }: { itens: ItemResumo[] }) {
  if (!itens || itens.length === 0) return null;
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-600">
      {itens.map((it, i) => {
        const nome = it.materials?.nome ?? "—";
        const peso = Number(it.peso ?? it.peso_liquido ?? 0);
        const pendente = precisaClassificar(nome);
        return (
          <span
            key={i}
            className={
              pendente
                ? "rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800"
                : "rounded-full bg-slate-100 px-2 py-0.5 font-semibold"
            }
          >
            {it.materials?.emoji ? `${it.materials.emoji} ` : ""}
            {nome} · {numeroBR(peso, peso % 1 === 0 ? 0 : 2)} {it.materials?.unidade ?? "kg"}
          </span>
        );
      })}
    </div>
  );
}

/** true se qualquer item da lista for material a classificar. */
export function temAClassificar(itens: ItemResumo[]): boolean {
  return (itens ?? []).some((it) => precisaClassificar(it.materials?.nome));
}
