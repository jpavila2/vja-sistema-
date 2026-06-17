"use client";

import { useMemo, useState, useTransition } from "react";
import { formatBRL } from "@/lib/format";
import { calcSubtotalVenda } from "@/lib/venda";
import { alterarDataVenda, editarVenda } from "./actions";
import type { FormaPagamentoVenda } from "@/lib/types";

export type MaterialVendaOpt = {
  id: number; nome: string; emoji: string | null; unidade: string; preco_venda: number;
};
type ItemVenda = {
  id: number; material_id: number; peso: number; preco_unitario: number; subtotal: number;
  materials: { nome: string; emoji: string | null; unidade: string } | null;
};

const FORMAS: { value: FormaPagamentoVenda; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "cheque", label: "Cheque" },
];

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
// yyyy-mm-dd no fuso de São Paulo (para o <input type="date">)
const dataSP = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

type Linha = { key: string; material_id: number; nome: string; emoji: string | null; unidade: string; pesoStr: string; precoStr: string };

export function EditorVenda({
  saleId, dataHora, formaPagamento, itens, materiais,
}: {
  saleId: number;
  dataHora: string;
  formaPagamento: FormaPagamentoVenda;
  itens: ItemVenda[];
  materiais: MaterialVendaOpt[];
}) {
  const [editando, setEditando] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [forma, setForma] = useState<FormaPagamentoVenda>(formaPagamento);
  const [addId, setAddId] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function abrirEdicao() {
    setLinhas(itens.map((it) => ({
      key: crypto.randomUUID(),
      material_id: it.material_id,
      nome: it.materials?.nome ?? "—",
      emoji: it.materials?.emoji ?? null,
      unidade: it.materials?.unidade ?? "kg",
      pesoStr: String(it.peso),
      precoStr: String(it.preco_unitario),
    })));
    setForma(formaPagamento);
    setMsg("");
    setEditando(true);
  }
  function setLinha(key: string, campo: "pesoStr" | "precoStr", v: string) {
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, [campo]: v } : l)));
  }
  function remover(key: string) { setLinhas((ls) => ls.filter((l) => l.key !== key)); }
  function adicionar(idStr: string) {
    const id = Number(idStr);
    const m = materiais.find((x) => x.id === id);
    if (!m) return;
    setLinhas((ls) => [...ls, {
      key: crypto.randomUUID(), material_id: m.id, nome: m.nome, emoji: m.emoji,
      unidade: m.unidade, pesoStr: "", precoStr: m.preco_venda > 0 ? String(m.preco_venda) : "",
    }]);
    setAddId("");
  }
  const totalEdit = useMemo(
    () => linhas.reduce((s, l) => s + calcSubtotalVenda(num(l.pesoStr), num(l.precoStr)), 0),
    [linhas]
  );
  function salvar() {
    if (pending) return;
    const itensSalvar = linhas
      .map((l) => ({ material_id: l.material_id, peso: num(l.pesoStr), preco_unitario: num(l.precoStr) }))
      .filter((i) => i.peso > 0);
    if (itensSalvar.length === 0) { setMsg("Coloque ao menos um item com peso."); return; }
    startTransition(async () => {
      try {
        await editarVenda({ id: saleId, forma_pagamento: forma, itens: itensSalvar });
        setEditando(false);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  if (editando) {
    return (
      <div className="mt-2 w-full rounded-xl border-2 border-marca-teal bg-white p-3">
        <div className="mb-2 font-bold text-marca-navy">✏️ Editando itens da venda</div>
        <div className="space-y-2">
          {linhas.map((l) => (
            <div key={l.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
              <span className="min-w-[8rem] flex-1 font-semibold text-slate-700">{l.emoji} {l.nome}</span>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                peso
                <input inputMode="decimal" value={l.pesoStr} onChange={(e) => setLinha(l.key, "pesoStr", e.target.value)}
                  aria-label={`Peso de ${l.nome}`}
                  className="w-20 rounded-lg border p-1.5 text-center text-base font-bold" />
                {l.unidade}
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                R$
                <input inputMode="decimal" value={l.precoStr} onChange={(e) => setLinha(l.key, "precoStr", e.target.value)}
                  aria-label={`Preço de ${l.nome}`}
                  className="w-20 rounded-lg border p-1.5 text-center text-base font-bold" />
              </label>
              <span className="w-24 text-right font-bold">{formatBRL(calcSubtotalVenda(num(l.pesoStr), num(l.precoStr)))}</span>
              <button onClick={() => remover(l.key)} aria-label={`Remover ${l.nome}`}
                className="rounded-lg bg-red-50 px-2 py-1.5 text-red-600">🗑️</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={addId} onChange={(e) => adicionar(e.target.value)} aria-label="Adicionar material"
            className="rounded-xl border px-3 py-2 text-sm font-semibold">
            <option value="">+ adicionar material…</option>
            {materiais.map((m) => (<option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Pagamento</label>
            <select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamentoVenda)} aria-label="Forma de pagamento"
              className="rounded-full border px-3 py-2 text-sm font-semibold">
              {FORMAS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-black text-marca-navy">Novo total: {formatBRL(totalEdit)}</span>
          <div className="flex gap-2">
            <button onClick={() => setEditando(false)} disabled={pending}
              className="rounded-full border px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={salvar} disabled={pending}
              className="rounded-full bg-marca-green px-5 py-2 text-sm font-bold text-white disabled:bg-slate-300">
              {pending ? "Salvando…" : "💾 Salvar"}
            </button>
          </div>
        </div>
        {msg ? <p className="mt-2 text-sm font-bold text-red-600">{msg}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={alterarDataVenda} className="flex items-center gap-1">
        <input type="hidden" name="id" value={saleId} />
        <label className="text-xs font-bold text-slate-500">📅 Data</label>
        <input type="date" name="data" defaultValue={dataSP(dataHora)}
          aria-label="Data da venda"
          className="rounded-full border px-2 py-1.5 text-sm font-semibold" />
        <button className="rounded-full border px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Mudar</button>
      </form>
      <button onClick={abrirEdicao}
        className="rounded-lg bg-marca-teal-light px-3 py-1.5 text-xs font-bold text-marca-teal-dark">
        ✏️ Editar itens
      </button>
    </div>
  );
}
