"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import { passaNoFiltro, somarPorForma, type FiltroPagamento } from "@/lib/pagamento";
import { CardCompra, type Compra, type MaterialOpt } from "./CardCompra";

type Fornecedor = { id: number; nome: string };

export function ListaConferencia({ compras, materiais, fornecedores }: { compras: Compra[]; materiais: MaterialOpt[]; fornecedores: Fornecedor[] }) {
  const [filtro, setFiltro] = useState<FiltroPagamento>("todos");
  if (compras.length === 0) {
    return <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">Nenhuma compra hoje.</p>;
  }
  // pendente ainda não tem forma definida — só entra no "Todos"
  const visiveis = compras.filter((c) => filtro === "todos" || (c.status !== "pendente" && passaNoFiltro(c.forma_pagamento, filtro)));
  const soma = somarPorForma(compras.filter((c) => c.status !== "pendente"));
  const opcoes: { valor: FiltroPagamento; rotulo: string }[] = [
    { valor: "todos", rotulo: `Todos (${compras.length})` },
    { valor: "dinheiro", rotulo: `💵 Dinheiro · ${formatBRL(soma.dinheiro)}` },
    { valor: "pix", rotulo: `📲 PIX · ${formatBRL(soma.pix)}` },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por pagamento">
        {opcoes.map((o) => (
          <button key={o.valor} type="button" onClick={() => setFiltro(o.valor)} aria-pressed={filtro === o.valor}
            className={"rounded-full border px-4 py-2 text-sm font-bold " +
              (filtro === o.valor ? "border-marca-teal bg-marca-teal text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
            {o.rotulo}
          </button>
        ))}
        {filtro !== "todos" ? (
          <span className="text-xs text-slate-400">Misto aparece nos dois; o valor de cada parte está no card.</span>
        ) : null}
      </div>
      {visiveis.length === 0 ? (
        <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">Nenhuma compra nesse filtro.</p>
      ) : (
        visiveis.map((c) => (
          <CardCompra key={c.id} compra={c} materiais={materiais} fornecedores={fornecedores} />
        ))
      )}
    </div>
  );
}
