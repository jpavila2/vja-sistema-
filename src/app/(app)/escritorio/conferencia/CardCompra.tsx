"use client";

import { useMemo, useState, useTransition } from "react";
import { formatBRL, calcSubtotal } from "@/lib/format";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { conferirCompra, cancelarCompra, editarCompra, excluirCompra, alterarDataCompra, trocarFornecedorCompra, salvarPrecosCliente } from "./actions";
import { buscarCatadores } from "@/lib/catador";

// yyyy-mm-dd no fuso de São Paulo (para o <input type="date">)
const dataSP = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export type MaterialOpt = { id: number; nome: string; emoji: string | null; unidade: string; preco_compra: number };
type Item = {
  id: number;
  material_id: number;
  peso_bruto: number;
  peso_liquido: number;
  preco_unitario: number;
  subtotal: number;
  materials: { nome: string; emoji: string | null; unidade: string } | null;
};
export type Compra = {
  id: number;
  total: number;
  status: string;
  forma_pagamento: string;
  data_hora: string;
  observacoes: string | null;
  pessoa_id: number | null;
  people: { nome: string } | null;
  purchase_items: Item[];
};

const BADGE: Record<string, string> = {
  pendente: "bg-marca-gold-light text-marca-gold",
  conferida: "bg-marca-teal-light text-marca-teal-dark",
  cancelada: "bg-red-100 text-red-600",
};

type LinhaEdit = {
  key: string;
  material_id: number;
  nome: string;
  emoji: string | null;
  unidade: string;
  pesoStr: string;
  precoStr: string;
};

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

type Fornecedor = { id: number; nome: string };

export function CardCompra({ compra: c, materiais, fornecedores }: { compra: Compra; materiais: MaterialOpt[]; fornecedores: Fornecedor[] }) {
  const [editando, setEditando] = useState(false);
  const [linhas, setLinhas] = useState<LinhaEdit[]>([]);
  const [forma, setForma] = useState(c.forma_pagamento === "pix" ? "pix" : "dinheiro");
  const [addId, setAddId] = useState("");
  const [salvarPrecos, setSalvarPrecos] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function abrirEdicao() {
    setLinhas(
      c.purchase_items.map((it) => ({
        key: crypto.randomUUID(),
        material_id: it.material_id,
        nome: it.materials?.nome ?? "—",
        emoji: it.materials?.emoji ?? null,
        unidade: it.materials?.unidade ?? "kg",
        pesoStr: String(it.peso_liquido),
        precoStr: String(it.preco_unitario),
      }))
    );
    setForma(c.forma_pagamento === "pix" ? "pix" : "dinheiro");
    setSalvarPrecos(false);
    setMsg("");
    setEditando(true);
  }

  function setLinha(key: string, campo: "pesoStr" | "precoStr", v: string) {
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, [campo]: v } : l)));
  }
  function remover(key: string) {
    setLinhas((ls) => ls.filter((l) => l.key !== key));
  }
  function adicionar(idStr: string) {
    const id = Number(idStr);
    const m = materiais.find((x) => x.id === id);
    if (!m) return;
    setLinhas((ls) => [
      ...ls,
      {
        key: crypto.randomUUID(),
        material_id: m.id,
        nome: m.nome,
        emoji: m.emoji,
        unidade: m.unidade,
        pesoStr: "",
        precoStr: m.preco_compra > 0 ? String(m.preco_compra) : "",
      },
    ]);
    setAddId("");
  }

  const totalEdit = useMemo(
    () => linhas.reduce((s, l) => s + calcSubtotal(num(l.pesoStr), num(l.precoStr)), 0),
    [linhas]
  );

  function salvar() {
    if (pending) return;
    const itens = linhas
      .map((l) => ({ material_id: l.material_id, peso_liquido: num(l.pesoStr), preco_unitario: num(l.precoStr) }))
      .filter((i) => i.peso_liquido > 0);
    if (itens.length === 0) {
      setMsg("Coloque ao menos um item com peso.");
      return;
    }
    startTransition(async () => {
      try {
        await editarCompra({ id: c.id, forma_pagamento: forma, itens });
        if (salvarPrecos && c.pessoa_id != null) {
          // salva o preço por material deste cliente (último preço lançado vence)
          const precos = linhas
            .filter((l) => num(l.precoStr) > 0)
            .map((l) => ({ material_id: l.material_id, preco: num(l.precoStr) }));
          if (precos.length > 0) {
            try { await salvarPrecosCliente(c.pessoa_id, precos); }
            catch { /* preço é secundário — não bloqueia a edição da compra */ }
          }
        }
        setEditando(false);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  // ── modo edição ──────────────────────────────────────────────────────────
  if (editando) {
    return (
      <div className="rounded-2xl border-2 border-marca-teal bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-bold text-marca-navy">✏️ Editando — {c.people?.nome ?? "—"}</span>
          {c.status === "conferida" ? (
            <span className="rounded-full bg-marca-teal-light px-2 py-0.5 text-xs font-bold text-marca-teal-dark">conferida</span>
          ) : null}
        </div>

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
              <span className="w-24 text-right font-bold">{formatBRL(calcSubtotal(num(l.pesoStr), num(l.precoStr)))}</span>
              <button onClick={() => remover(l.key)} aria-label={`Remover ${l.nome}`}
                className="rounded-lg bg-red-50 px-2 py-1.5 text-red-600">🗑️</button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={addId} onChange={(e) => adicionar(e.target.value)} aria-label="Adicionar material"
            className="rounded-xl border px-3 py-2 text-sm font-semibold">
            <option value="">+ adicionar material…</option>
            {materiais.map((m) => (
              <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Pagamento</label>
            <select value={forma} onChange={(e) => setForma(e.target.value)} aria-label="Forma de pagamento"
              className="rounded-full border px-3 py-2 text-sm font-semibold">
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
            </select>
          </div>
        </div>

        {c.pessoa_id != null ? (
          <label className="mt-3 flex items-center gap-2 rounded-xl bg-marca-teal-light/40 p-2.5 text-sm font-semibold text-marca-teal-dark">
            <input type="checkbox" checked={salvarPrecos} onChange={(e) => setSalvarPrecos(e.target.checked)}
              className="h-4 w-4" />
            💾 Salvar esses preços para {c.people?.nome ?? "este cliente"} (vira o preço padrão dele na balança)
          </label>
        ) : null}

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

  // ── modo visualização ────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
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

      <div className="mt-3 flex flex-wrap gap-2">
        {c.status === "pendente" ? (
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
        ) : null}

        {c.status !== "cancelada" ? (
          <button onClick={abrirEdicao}
            className="rounded-full border border-marca-teal px-4 py-2 text-sm font-bold text-marca-teal-dark hover:bg-marca-teal-light">
            ✏️ Editar
          </button>
        ) : null}

        {c.status !== "cancelada" ? (
          <EditorFornecedor compraId={c.id} fornecedores={fornecedores} />
        ) : null}

        {c.status !== "cancelada" ? (
          <form action={alterarDataCompra} className="flex items-center gap-1">
            <input type="hidden" name="id" value={c.id} />
            <label className="text-xs font-bold text-slate-500">📅 Data</label>
            <input type="date" name="data" defaultValue={dataSP(c.data_hora)}
              aria-label="Data do lançamento"
              className="rounded-full border px-2 py-1.5 text-sm font-semibold" />
            <button className="rounded-full border px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Mudar
            </button>
          </form>
        ) : null}

        {c.status !== "cancelada" ? (
          <BotaoConfirmar
            acao={cancelarCompra}
            hidden={{ id: c.id, motivo: "cancelada na conferência" }}
            mensagem={`Cancelar a compra de ${c.people?.nome ?? "—"} (${formatBRL(c.total)})? O estoque será estornado, mas a compra continua no histórico como cancelada.`}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            Cancelar
          </BotaoConfirmar>
        ) : null}

        <BotaoConfirmar
          acao={excluirCompra}
          hidden={{ id: c.id }}
          mensagem={`EXCLUIR DE VEZ a compra de ${c.people?.nome ?? "—"} (${formatBRL(c.total)})? Ela some do sistema e do histórico${c.status !== "cancelada" ? ", e o estoque é estornado" : ""}. Não dá pra desfazer.`}
          className="rounded-full border border-red-500 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
        >
          🗑️ Excluir
        </BotaoConfirmar>
      </div>
    </div>
  );
}

/** Combobox para trocar o vendedor (fornecedor) de uma compra na conferência. */
function EditorFornecedor({ compraId, fornecedores }: { compraId: number; fornecedores: { id: number; nome: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<{ id: number; nome: string } | null>(null);
  const sug = buscarCatadores(fornecedores, busca);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)}
        className="rounded-full border px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
        👤 Trocar vendedor
      </button>
    );
  }
  return (
    <form action={trocarFornecedorCompra} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={compraId} />
      <input type="hidden" name="pessoa_id" value={sel?.id ?? ""} />
      <div className="relative">
        <input
          autoFocus
          aria-label="Buscar vendedor"
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setSel(null); }}
          placeholder="Digite o vendedor…"
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
