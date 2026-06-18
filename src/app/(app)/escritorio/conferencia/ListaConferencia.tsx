"use client";

import { CardCompra, type Compra, type MaterialOpt } from "./CardCompra";

type Fornecedor = { id: number; nome: string };

export function ListaConferencia({ compras, materiais, fornecedores }: { compras: Compra[]; materiais: MaterialOpt[]; fornecedores: Fornecedor[] }) {
  if (compras.length === 0) {
    return <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">Nenhuma compra hoje.</p>;
  }
  return (
    <div className="space-y-3">
      {compras.map((c) => (
        <CardCompra key={c.id} compra={c} materiais={materiais} fornecedores={fornecedores} />
      ))}
    </div>
  );
}
