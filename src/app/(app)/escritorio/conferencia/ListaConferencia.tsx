"use client";

import { CardCompra, type Compra, type MaterialOpt } from "./CardCompra";

export function ListaConferencia({ compras, materiais }: { compras: Compra[]; materiais: MaterialOpt[] }) {
  if (compras.length === 0) {
    return <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">Nenhuma compra hoje.</p>;
  }
  return (
    <div className="space-y-3">
      {compras.map((c) => (
        <CardCompra key={c.id} compra={c} materiais={materiais} />
      ))}
    </div>
  );
}
