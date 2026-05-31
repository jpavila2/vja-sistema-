"use client";

import { formatBRL } from "@/lib/format";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { conferirCompra, cancelarCompra } from "./actions";

type Item = { id: number; peso_liquido: number; preco_unitario: number; subtotal: number; materials: { nome: string; emoji: string | null; unidade: string } | null };
type Compra = { id: number; total: number; status: string; forma_pagamento: string; data_hora: string; observacoes: string | null; people: { nome: string } | null; purchase_items: Item[] };

const BADGE: Record<string, string> = {
  pendente: "bg-marca-gold-light text-marca-gold",
  conferida: "bg-marca-teal-light text-marca-teal-dark",
  cancelada: "bg-red-100 text-red-600",
};

export function ListaConferencia({ compras }: { compras: Compra[] }) {
  if (compras.length === 0) {
    return <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">Nenhuma compra hoje.</p>;
  }
  return (
    <div className="space-y-3">
      {compras.map((c) => (
        <div key={c.id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-marca-navy">{c.people?.nome ?? "—"}</span>
            <span className={"rounded-full px-2 py-0.5 text-xs font-bold " + (BADGE[c.status] ?? "")}>{c.status}</span>
            <span className="text-sm text-slate-500">
              {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
            </span>
            {c.status !== "pendente" ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {c.forma_pagamento === "pix" ? "PIX" : "Dinheiro"}
              </span>
            ) : null}
            <span className="ml-auto text-xl font-black text-marca-navy">{formatBRL(c.total)}</span>
          </div>
          <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
            {c.purchase_items.map((it) => (
              <li key={it.id}>
                {it.materials?.emoji} {it.materials?.nome}: {it.peso_liquido.toLocaleString("pt-BR")} {it.materials?.unidade} × {formatBRL(it.preco_unitario)} = {formatBRL(it.subtotal)}
              </li>
            ))}
          </ul>
          {c.status === "pendente" ? (
            <div className="mt-3 flex gap-2">
              <form action={conferirCompra} className="flex items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <select name="forma_pagamento" defaultValue="dinheiro" className="rounded-full border px-3 py-2 text-sm font-semibold">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                </select>
                <button className="rounded-full bg-marca-teal px-4 py-2 text-sm font-bold text-white hover:bg-marca-teal-dark">
                  ✓ Conferir
                </button>
              </form>
              <BotaoConfirmar
                acao={cancelarCompra}
                hidden={{ id: c.id, motivo: "cancelada na conferência" }}
                mensagem={`Cancelar a compra de ${c.people?.nome ?? "—"} (${formatBRL(c.total)})? O estoque será estornado.`}
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                Cancelar
              </BotaoConfirmar>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
