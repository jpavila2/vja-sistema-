"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";

const horaBR = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

type Item = {
  peso_bruto: number;
  peso_liquido: number;
  preco_unitario: number;
  subtotal: number;
  materials: { nome: string; emoji: string | null; unidade: string } | null;
};

export type CompraCaixa = {
  id: number;
  total: number;
  data_hora: string;
  people: { nome: string } | null;
  purchase_items: Item[];
};

/** Lista de compras clicável: clica em cima e desce o descritivo do que foi comprado. */
export function ListaComprasCaixa({ compras, corValor }: { compras: CompraCaixa[]; corValor: string }) {
  const [expandido, setExpandido] = useState<number | null>(null);

  return (
    <ul>
      {compras.map((c) => {
        const aberto = expandido === c.id;
        return (
          <li key={c.id} className="border-b last:border-0">
            <button
              onClick={() => setExpandido(aberto ? null : c.id)}
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"
            >
              <div className="flex-1">
                <div className="font-bold text-marca-navy">{c.people?.nome ?? "Avulso"}</div>
                <div className="text-xs text-slate-500">
                  {horaBR(c.data_hora)} · {c.purchase_items.length} item(ns)
                </div>
              </div>
              <span className={"font-black " + corValor}>{formatBRL(Number(c.total))}</span>
              <span className="text-slate-400">{aberto ? "▴" : "▾"}</span>
            </button>
            {aberto ? (
              <ul className="border-t bg-slate-50/60 px-3 py-2 text-sm">
                {c.purchase_items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 py-0.5">
                    <span>{it.materials?.emoji ?? "📦"}</span>
                    <span className="flex-1 text-slate-600">
                      {it.materials?.nome ?? "—"}: {it.peso_liquido.toLocaleString("pt-BR")} {it.materials?.unidade ?? ""} × {formatBRL(it.preco_unitario)}
                      {it.peso_liquido !== it.peso_bruto ? ` (bruto ${it.peso_bruto.toLocaleString("pt-BR")})` : ""}
                    </span>
                    <span className="font-bold">{formatBRL(it.subtotal)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
