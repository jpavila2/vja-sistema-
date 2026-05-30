"use client";

import { useMemo, useState, type ReactNode } from "react";

export type Coluna<T> = {
  titulo: string;
  render: (item: T) => ReactNode;
  className?: string;
};

export function TabelaBusca<T>({
  itens,
  colunas,
  campoBusca,
  placeholder = "Buscar...",
  vazio = "Nada encontrado.",
}: {
  itens: T[];
  colunas: Coluna<T>[];
  campoBusca: (item: T) => string;
  placeholder?: string;
  vazio?: string;
}) {
  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((i) => campoBusca(i).toLowerCase().includes(termo));
  }, [q, itens, campoBusca]);

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border p-3 text-base"
      />
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              {colunas.map((c, i) => (
                <th key={i} className={"p-3 font-semibold " + (c.className ?? "")}>{c.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={colunas.length} className="p-6 text-center text-slate-400">{vazio}</td>
              </tr>
            ) : (
              filtrados.map((item, ri) => (
                <tr key={ri} className="border-b last:border-0">
                  {colunas.map((c, ci) => (
                    <td key={ci} className={"p-3 " + (c.className ?? "")}>{c.render(item)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
