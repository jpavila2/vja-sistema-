"use client";

import { useMemo, useState, useTransition } from "react";
import { formatBRL } from "@/lib/format";
import { calcTotalVenda, calcSubtotalVenda } from "@/lib/venda";
import { usePersistedState } from "@/lib/usePersistedState";
import { buscarCatadores } from "@/lib/catador";
import { registrarVenda } from "./actions";
import type { Material, ItemCarrinhoVenda, Pessoa, FormaPagamentoVenda } from "@/lib/types";

type Props = {
  materiais: Material[];
  compradores: Pick<Pessoa, "id" | "nome">[];
};

const FORMAS: { value: FormaPagamentoVenda; label: string; emoji: string }[] = [
  { value: "pix",          label: "PIX",          emoji: "📲" },
  { value: "dinheiro",     label: "Dinheiro",      emoji: "💵" },
  { value: "transferencia",label: "Transferência", emoji: "🏦" },
  { value: "boleto",       label: "Boleto",        emoji: "📄" },
  { value: "cheque",       label: "Cheque",        emoji: "📑" },
];

export function TelaVendas({ materiais, compradores }: Props) {
  // rascunho automático: o carrinho fica salvo no aparelho e volta se fechar/atualizar
  const [carrinho, setCarrinho] = usePersistedState<ItemCarrinhoVenda[]>("vja:vendas:carrinho:v1", []);
  const [formaPgto, setFormaPgto] = useState<FormaPagamentoVenda>("pix");
  const [aPrazo, setAPrazo] = useState(false);
  const [obsVenda, setObsVenda] = useState("");

  // comprador
  const [buscaComp, setBuscaComp] = useState("");
  const [compradorSel, setCompradorSel] = useState<Pick<Pessoa,"id"|"nome"> | null>(null);
  const [mostrarSugComp, setMostrarSugComp] = useState(false);

  // item sendo configurado
  const [matSel, setMatSel] = useState<Material | null>(null);
  const [pesoStr, setPesoStr] = useState("");
  const [precoStr, setPrecoStr] = useState("");

  const [buscaMat, setBuscaMat] = useState("");
  const [msg, setMsg] = useState("");
  const [reqId, setReqId] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const materiaisFiltrados = buscaMat.trim()
    ? materiais.filter((m) => norm(m.nome).includes(norm(buscaMat)))
    : materiais;

  const sugComp = buscarCatadores(compradores, buscaComp);
  const total = useMemo(() => calcTotalVenda(carrinho), [carrinho]);

  function abrirItem(m: Material) {
    setMatSel(m);
    setPesoStr("");
    setPrecoStr(m.preco_venda > 0 ? String(m.preco_venda) : "");
  }

  function adicionarItem() {
    if (!matSel) return;
    const peso = parseFloat(pesoStr.replace(",", "."));
    const preco = parseFloat(precoStr.replace(",", "."));
    if (!(peso > 0)) { setMsg("Informe o peso."); return; }
    if (!(preco >= 0)) { setMsg("Informe o preço de venda."); return; }
    const subtotal = calcSubtotalVenda(peso, preco);
    setCarrinho((c) => [...c, {
      material_id: matSel.id, nome: matSel.nome, emoji: matSel.emoji,
      unidade: matSel.unidade, preco_unitario: preco, peso, subtotal,
    }]);
    setMatSel(null);
    setMsg("");
  }

  function remover(i: number) { setCarrinho((c) => c.filter((_, idx) => idx !== i)); }

  function finalizar() {
    if (pending) return;
    if (carrinho.length === 0) { setMsg("Adicione pelo menos um item."); return; }
    if (!compradorSel) { setMsg("Selecione o comprador."); return; }
    startTransition(async () => {
      try {
        const res = await registrarVenda({
          pessoa_id: compradorSel.id,
          observacoes: obsVenda.trim(),
          forma_pagamento: formaPgto,
          itens: carrinho.map((i) => ({
            material_id: i.material_id, peso: i.peso, preco_unitario: i.preco_unitario,
          })),
          client_request_id: reqId,
          recebido: !aPrazo,
        });
        if (res.ok) {
          setMsg(`✅ Venda salva — ${formatBRL(total)}${aPrazo ? " (a receber)" : ""}`);
          setCarrinho([]); setBuscaComp(""); setCompradorSel(null);
          setObsVenda(""); setFormaPgto("pix"); setAPrazo(false);
          setReqId(crypto.randomUUID());
        } else {
          setMsg("Erro: " + res.erro);
        }
      } catch (e) {
        setMsg("Erro ao salvar — tente de novo. " + (e instanceof Error ? e.message : ""));
      }
    });
  }

  const btn = "rounded-xl text-base font-bold active:scale-95 transition-transform";
  const tabFP = (on: boolean) =>
    "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-sm font-bold border-2 " +
    (on ? "border-marca-teal bg-marca-teal text-white" : "border-slate-200 bg-white text-slate-600 hover:border-marca-teal");

  return (
    <div className="space-y-4">

      {/* ── comprador + forma de pagamento ── */}
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="font-bold text-marca-navy">Comprador</div>
        <div className="relative">
          <input
            aria-label="Buscar comprador"
            value={buscaComp}
            onChange={(e) => { setBuscaComp(e.target.value); setCompradorSel(null); setMostrarSugComp(true); }}
            onFocus={() => setMostrarSugComp(true)}
            placeholder="Digite para encontrar o comprador…"
            className="w-full rounded-xl border p-3 text-base"
          />
          {mostrarSugComp && !compradorSel && sugComp.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-white shadow-lg">
              {sugComp.map((s) => (
                <li key={s.id}>
                  <button type="button"
                    onClick={() => { setCompradorSel(s); setBuscaComp(s.nome); setMostrarSugComp(false); }}
                    className="block w-full px-4 py-3 text-left text-base hover:bg-marca-teal-light">
                    {s.nome}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {compradorSel ? (
            <p className="mt-1 text-sm font-bold text-marca-teal-dark">Vendendo para: {compradorSel.nome}</p>
          ) : buscaComp.trim() ? (
            <p className="mt-1 text-sm text-amber-600">Toque no nome na lista acima.</p>
          ) : null}
        </div>

        <div>
          <div className="mb-2 text-sm font-bold text-marca-navy">Forma de recebimento</div>
          <div className="flex flex-wrap gap-2">
            {FORMAS.map((f) => (
              <button key={f.value} type="button" onClick={() => setFormaPgto(f.value)} className={tabFP(formaPgto === f.value)}>
                <span>{f.emoji}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
          {formaPgto === "dinheiro" ? (
            <p className="mt-1 text-xs text-marca-green-dark font-semibold">💵 Entra no caixa físico do dia.</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Não entra no caixa físico — só registrado.</p>
          )}
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-sm font-semibold text-amber-800">
            <input type="checkbox" checked={aPrazo} onChange={(e) => setAPrazo(e.target.checked)} className="h-5 w-5" />
            ⏳ Venda a prazo (ainda não recebido) — vai para Contas a receber
          </label>
        </div>

        <div>
          <input value={obsVenda} onChange={(e) => setObsVenda(e.target.value)}
            placeholder="Observações (opcional)"
            className="w-full rounded-xl border p-2 text-sm" />
        </div>
      </div>

      {/* ── grade de materiais ── */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-marca-navy">Selecione o material</span>
          <span className="text-xs text-slate-400">{materiaisFiltrados.length} de {materiais.length}</span>
        </div>
        <div className="relative mb-3">
          <input
            value={buscaMat}
            onChange={(e) => setBuscaMat(e.target.value)}
            aria-label="Buscar material"
            placeholder="🔎 Buscar material por nome…"
            className="w-full rounded-xl border p-3 text-base"
          />
          {buscaMat && (
            <button type="button" onClick={() => setBuscaMat("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100">
              ✕
            </button>
          )}
        </div>
        {materiaisFiltrados.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-slate-400">
            Nenhum material com “{buscaMat}”.
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {materiaisFiltrados.map((m) => (
            <button key={m.id} onClick={() => abrirItem(m)}
              className={`${btn} flex min-h-[100px] flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-white p-3 shadow-sm hover:border-marca-teal`}>
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-base">{m.nome}</span>
              <span className="text-xs font-bold text-marca-teal-dark">
                estq: {m.estoque_atual.toLocaleString("pt-BR")} {m.unidade}
              </span>
            </button>
          ))}
        </div>
        )}
      </div>

      {/* ── carrinho ── */}
      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold">Itens desta venda</div>
        {carrinho.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhum item ainda.</div>
        ) : carrinho.map((it, i) => (
          <div key={i} className="flex items-center gap-3 border-b p-3 last:border-0">
            <span className="text-2xl">{it.emoji}</span>
            <div className="flex-1">
              <div className="font-bold">{it.nome}</div>
              <div className="text-sm text-slate-500">
                {it.peso.toLocaleString("pt-BR")} {it.unidade} × {formatBRL(it.preco_unitario)}/kg
              </div>
            </div>
            <span className="font-extrabold text-marca-teal-dark">{formatBRL(it.subtotal)}</span>
            <button onClick={() => remover(i)}
              className="rounded-lg bg-red-50 px-3 py-2 text-red-600">🗑️</button>
          </div>
        ))}
        <div className="flex items-center justify-between p-4 text-2xl font-black">
          <span>TOTAL</span>
          <span className="text-marca-teal-dark">{formatBRL(total)}</span>
        </div>
        <button onClick={finalizar} disabled={carrinho.length === 0 || pending}
          className="w-full rounded-b-2xl bg-marca-teal p-5 text-xl font-black text-white disabled:bg-slate-300">
          {pending ? "Salvando…" : `📦 REGISTRAR VENDA${carrinho.length ? " (" + formatBRL(total) + ")" : ""}`}
        </button>
      </div>

      {msg ? <p className="text-center text-lg font-bold">{msg}</p> : null}

      {/* ── modal: configurar item ── */}
      {matSel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{matSel.emoji}</span>
              <div>
                <div className="text-xl font-black">{matSel.nome}</div>
                <div className="text-sm text-slate-500">
                  Estoque: <b>{matSel.estoque_atual.toLocaleString("pt-BR")} {matSel.unidade}</b>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Peso ({matSel.unidade})
                </label>
                <input
                  type="text" inputMode="decimal" value={pesoStr}
                  onChange={(e) => setPesoStr(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border p-3 text-2xl font-bold text-center"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Preço de venda (R$/{matSel.unidade})
                </label>
                <input
                  type="text" inputMode="decimal" value={precoStr}
                  onChange={(e) => setPrecoStr(e.target.value)}
                  placeholder={matSel.preco_venda > 0 ? String(matSel.preco_venda) : "0,00"}
                  className="w-full rounded-xl border p-3 text-2xl font-bold text-center"
                />
              </div>
            </div>

            {pesoStr && precoStr ? (
              <div className="rounded-xl bg-marca-teal/10 p-3 text-center">
                <span className="text-sm text-slate-600">Subtotal: </span>
                <span className="text-xl font-black text-marca-teal-dark">
                  {formatBRL(calcSubtotalVenda(
                    parseFloat(pesoStr.replace(",", ".")) || 0,
                    parseFloat(precoStr.replace(",", ".")) || 0,
                  ))}
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMatSel(null)}
                className="rounded-xl bg-slate-200 p-4 font-bold">Cancelar</button>
              <button onClick={adicionarItem}
                className="rounded-xl bg-marca-teal p-4 font-bold text-white">✅ Adicionar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
