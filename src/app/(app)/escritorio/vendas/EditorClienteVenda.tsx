"use client";

import { useState } from "react";
import { buscarCatadores } from "@/lib/catador";
import { trocarClienteVenda } from "./actions";
import type { Pessoa } from "@/lib/types";

type Comp = Pick<Pessoa, "id" | "nome">;

export function EditorClienteVenda({
  saleId, compradores,
}: { saleId: number; compradores: Comp[] }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Comp | null>(null);
  const sug = buscarCatadores(compradores, busca);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)}
        className="rounded-lg bg-marca-teal-light px-3 py-1.5 text-xs font-bold text-marca-teal-dark">
        ✏️ Trocar cliente
      </button>
    );
  }

  return (
    <form action={trocarClienteVenda} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={saleId} />
      <input type="hidden" name="pessoa_id" value={sel?.id ?? ""} />
      <div className="relative">
        <input
          autoFocus
          aria-label="Buscar cliente"
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setSel(null); }}
          placeholder="Digite o cliente…"
          className="w-48 rounded-lg border p-2 text-sm"
        />
        {!sel && busca.trim() && sug.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white shadow-lg">
            {sug.map((s) => (
              <li key={s.id}>
                <button type="button"
                  onClick={() => { setSel(s); setBusca(s.nome); }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-marca-teal-light">
                  {s.nome}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" disabled={!sel}
        className="rounded-lg bg-marca-teal px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">
        Salvar
      </button>
      <button type="button" onClick={() => { setAberto(false); setBusca(""); setSel(null); }}
        className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-500">
        Cancelar
      </button>
    </form>
  );
}
