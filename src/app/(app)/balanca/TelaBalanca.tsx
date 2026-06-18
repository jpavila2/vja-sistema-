"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatBRL, calcSubtotal } from "@/lib/format";
import { calcTotalCompra, pesoLiquido } from "@/lib/compra";
import { useComandas } from "@/lib/useComandas";
import { useFilaEnvio } from "@/lib/useFilaEnvio";
import { type Comanda, type CompraPayload, rotuloComanda } from "@/lib/comandas";
import { registrarCompra, criarCatador, precosDoCatador, salvarPrecosCatador } from "./actions";
import { BarraComandas } from "./BarraComandas";
import { IndicadorFila } from "./IndicadorFila";
import { buscarCatadores, resolverCatador, type CatadorOpt } from "@/lib/catador";
import type { Material, ItemCesta, Pessoa } from "@/lib/types";

type Props = {
  materiais: Material[];
  fornecedores: Pick<Pessoa, "id" | "nome">[];
  avulsoId: number | null;
};

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export function TelaBalanca({ materiais, fornecedores, avulsoId }: Props) {
  // comandas (pesagens abertas) salvas no aparelho — rascunho que não se perde
  const { comandas, ativa, ativaId, hidratado, selecionar, nova, encerrar, patchAtiva } = useComandas();
  // fila de envio offline: finaliza sem internet e sobe sozinho quando voltar
  const { pendentes, enfileirar } = useFilaEnvio((p) => registrarCompra(p));

  // pesagem em andamento (modal) — estado local p/ teclado responsivo; é espelhado
  // na comanda ativa (emAndamento) para sobreviver a recarga/troca de comanda
  const [sel, setSel] = useState<Material | null>(null);
  const [pesoStr, setPesoStr] = useState("0");
  const [precoStr, setPrecoStr] = useState("");
  const [bags, setBags] = useState(0);
  const [kgBagStr, setKgBagStr] = useState("3");
  const [bagsCustom, setBagsCustom] = useState(false);
  const [pct, setPct] = useState(0);
  const [pctStr, setPctStr] = useState("");

  // UI efêmera (não persiste)
  const [mostrarSug, setMostrarSug] = useState(false);
  const [buscaMat, setBuscaMat] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [salvandoCat, setSalvandoCat] = useState(false);
  const [precosCatador, setPrecosCatador] = useState<Record<number, number>>({});

  // campos da comanda ativa
  const { modo, busca, catadorSel, novoNome, novoTel, salvarPrecos, cesta } = ativa;

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const materiaisFiltrados = buscaMat.trim()
    ? materiais.filter((m) => norm(m.nome).includes(norm(buscaMat)))
    : materiais;

  const sugestoes = buscarCatadores(fornecedores, busca);
  const resol = resolverCatador(fornecedores, busca);
  const catadorEfetivo: CatadorOpt | null =
    catadorSel ?? (resol.tipo === "ok" ? { id: resol.id, nome: resol.nome } : null);
  const catadorId = catadorEfetivo?.id ?? null;

  // carrega os preços próprios do catador quando ele muda
  useEffect(() => {
    if (catadorId == null) { setPrecosCatador({}); return; }
    let ativo = true;
    precosDoCatador(catadorId).then((m) => { if (ativo) setPrecosCatador(m); });
    return () => { ativo = false; };
  }, [catadorId]);

  // ── sincroniza modal <-> comanda ativa ───────────────────────────────────
  const modalDaComanda = useRef<string | null>(null);
  const pulaPersist = useRef(false);
  // ao trocar de comanda (ou hidratar): carrega a pesagem em andamento dela
  useEffect(() => {
    if (!hidratado) return;
    if (modalDaComanda.current === ativaId) return;
    modalDaComanda.current = ativaId;
    pulaPersist.current = true;
    const ea = ativa.emAndamento;
    if (ea) {
      setSel(materiais.find((m) => m.id === ea.material_id) ?? null);
      setPesoStr(ea.pesoStr); setPrecoStr(ea.precoStr);
      setBags(ea.bags); setBagsCustom(ea.bagsCustom);
      setKgBagStr(ea.kgBagStr); setPct(ea.pct); setPctStr(ea.pctStr);
    } else {
      setSel(null); setPesoStr("0"); setPrecoStr(""); setBags(0);
      setBagsCustom(false); setKgBagStr("3"); setPct(0); setPctStr("");
    }
    setMostrarSug(false); setMsg("");
  }, [ativaId, hidratado, ativa, materiais]);
  // espelha a pesagem em andamento na comanda (sobrevive a recarga no meio)
  useEffect(() => {
    if (!hidratado) return;
    if (modalDaComanda.current !== ativaId) return;
    if (pulaPersist.current) { pulaPersist.current = false; return; }
    patchAtiva({
      emAndamento: sel
        ? { material_id: sel.id, pesoStr, precoStr, bags, bagsCustom, kgBagStr, pct, pctStr }
        : null,
    });
  }, [sel, pesoStr, precoStr, bags, bagsCustom, kgBagStr, pct, pctStr, hidratado, ativaId, patchAtiva]);

  const peso = parseFloat(pesoStr.replace(",", ".")) || 0;
  const kgBag = parseFloat(kgBagStr.replace(",", ".")) || 0;
  const descontoBag = r3(Math.max(0, bags) * Math.max(0, kgBag));
  const liquido = sel ? pesoLiquido(peso, bags, kgBag, pct) : 0;
  const precoEdit = parseFloat(precoStr.replace(",", ".")) || 0;
  const valorAtual = sel ? calcSubtotal(liquido, precoEdit) : 0;
  const total = useMemo(() => calcTotalCompra(cesta), [cesta]);

  function abrir(m: Material) {
    setSel(m); setPesoStr("0"); setPct(0); setPctStr("");
    setBags(0); setKgBagStr("3"); setBagsCustom(false);
    const precoBase = precosCatador[m.id] ?? m.preco_compra;
    setPrecoStr(precoBase > 0 ? String(precoBase) : "");
  }
  function tecla(k: string) {
    setPesoStr((c) => (k === "back" ? (c.length > 1 ? c.slice(0, -1) : "0") : k === "," ? (c.includes(",") ? c : c + ",") : c === "0" ? k : c + k));
  }
  function escolherBags(n: number) { setBags((b) => (b === n ? 0 : n)); setBagsCustom(false); }
  function bagsCustomChange(v: string) {
    const n = parseInt(v.replace(/\D/g, ""), 10);
    setBags(Number.isFinite(n) && n > 0 ? n : 0);
  }
  function escolherPct(p: number) { setPct(p); setPctStr(""); }
  function pctCustom(v: string) {
    setPctStr(v);
    const n = parseFloat(v.replace(",", "."));
    setPct(Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0);
  }
  function fecharModal() {
    setSel(null); setPesoStr("0"); setPct(0); setPctStr("");
    setBags(0); setKgBagStr("3"); setBagsCustom(false); setPrecoStr("");
  }
  function adicionar() {
    if (!sel || liquido <= 0) { setMsg("Digite o peso"); return; }
    if (precoEdit < 0) { setMsg("Preço inválido"); return; }
    const item: ItemCesta = {
      material_id: sel.id, nome: sel.nome, emoji: sel.emoji, unidade: sel.unidade,
      preco_unitario: precoEdit, peso_bruto: peso, peso_liquido: liquido,
      subtotal: calcSubtotal(liquido, precoEdit),
    };
    patchAtiva({ cesta: [...cesta, item], emAndamento: null });
    fecharModal(); setMsg("");
  }
  function remover(i: number) { patchAtiva({ cesta: cesta.filter((_, idx) => idx !== i) }); }

  function obterCatadorPayload(c: Comanda): { pessoa_id: number | null; nome: string; tel: string } | null {
    if (c.modo === "avulso") {
      if (avulsoId) return { pessoa_id: avulsoId, nome: "", tel: "" };
      return { pessoa_id: null, nome: "Avulso", tel: "" };
    }
    if (c.modo === "novo") {
      if (c.novoNome.trim() === "") return null;
      return { pessoa_id: null, nome: c.novoNome.trim(), tel: c.novoTel.trim() };
    }
    const r = resolverCatador(fornecedores, c.busca);
    const efetivo = c.catadorSel ?? (r.tipo === "ok" ? { id: r.id, nome: r.nome } : null);
    if (efetivo) return { pessoa_id: efetivo.id, nome: "", tel: "" };
    return null;
  }

  function msgCatador(): string {
    if (modo === "novo") return "Digite o nome do catador";
    if (resol.tipo === "ambiguo") return "Há mais de um catador com esse nome — toque no certo na lista";
    return "Toque no nome do catador na lista ou use o + para cadastrar";
  }

  function salvarCatadorNovo() {
    if (salvandoCat) return;
    if (novoNome.trim() === "") { setMsg("Digite o nome do catador"); return; }
    setSalvandoCat(true);
    (async () => {
      const res = await criarCatador(novoNome, novoTel);
      setSalvandoCat(false);
      if (res.ok) {
        patchAtiva({ catadorSel: { id: res.id, nome: res.nome }, busca: res.nome, novoNome: "", novoTel: "", modo: "conhecido" });
        setMostrarSug(false);
        setMsg(`✅ Catador "${res.nome}" cadastrado`);
      } else setMsg("Erro ao cadastrar catador: " + res.erro);
    })();
  }

  function precosDaCesta(c: Comanda): { material_id: number; preco: number | null }[] {
    const mapa = new Map<number, number>();
    c.cesta.forEach((i) => mapa.set(i.material_id, i.preco_unitario));
    return Array.from(mapa, ([material_id, preco]) => ({ material_id, preco }));
  }

  function finalizar() {
    if (pending) return;
    const c = ativa;
    if (c.cesta.length === 0) return;
    const cat = obterCatadorPayload(c);
    if (!cat) { setMsg(msgCatador()); return; }
    const totalC = calcTotalCompra(c.cesta);
    const payload: CompraPayload = {
      pessoa_id: cat.pessoa_id, catador_nome: cat.nome, catador_telefone: cat.tel,
      observacoes: "",
      itens: c.cesta.map((i) => ({ material_id: i.material_id, peso_bruto: i.peso_bruto, peso_liquido: i.peso_liquido, preco_unitario: i.preco_unitario })),
      client_request_id: c.client_request_id,
    };
    const querPrecos = salvarPrecos && cat.pessoa_id != null;
    const precos = precosDaCesta(c);
    setPending(true);
    (async () => {
      try {
        const res = await registrarCompra(payload);
        if (res.ok) {
          if (querPrecos && cat.pessoa_id != null) {
            try { await salvarPrecosCatador(cat.pessoa_id, precos); } catch { /* preço é secundário */ }
          }
          setMsg(`✅ Compra salva — ${formatBRL(totalC)}`);
          encerrar(c.id);
        } else {
          setMsg("Erro: " + res.erro); // erro de negócio: não enfileira
        }
      } catch {
        // sem internet / falha de transporte: guarda na fila e segue trabalhando
        enfileirar(payload);
        setMsg(`📤 Sem internet — compra de ${formatBRL(totalC)} guardada. Sobe sozinho quando voltar.`);
        encerrar(c.id);
      } finally {
        setPending(false);
      }
    })();
  }

  const btn = "rounded-xl text-xl font-extrabold active:scale-95 transition-transform";
  const tab = (on: boolean) => "rounded-full px-4 py-2 text-sm font-bold " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-600");
  const bagBtn = (on: boolean) => "rounded-xl px-5 py-3 text-xl font-black active:scale-95 " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-700");
  const pctBtn = (on: boolean) => "rounded-lg px-3 py-1.5 text-sm font-bold " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-600");

  if (!hidratado) {
    return <div className="p-8 text-center text-slate-400">Carregando…</div>;
  }

  return (
    <div className={"space-y-4 " + (cesta.length > 0 ? "pb-40" : "")}>
      {/* barra de pesagens abertas (comandas) + fila offline */}
      <BarraComandas
        comandas={comandas}
        ativaId={ativaId}
        onSelecionar={selecionar}
        onNova={nova}
        onExcluir={(id) => {
          const c = comandas.find((x) => x.id === id);
          if (c && c.cesta.length > 0 && !confirm(`Excluir a pesagem de ${rotuloComanda(c)} com ${c.cesta.length} item(ns)? Não dá pra desfazer.`)) return;
          if (id === ativaId) fecharModal();
          encerrar(id);
        }}
      />
      <IndicadorFila pendentes={pendentes} />

      {/* catador */}
      <div className="rounded-2xl border bg-white p-3">
        <div className="mb-2 flex gap-2">
          <button onClick={() => patchAtiva({ modo: "conhecido" })} className={tab(modo === "conhecido")}>Cadastrado</button>
          <button onClick={() => patchAtiva({ modo: "novo" })} className={tab(modo === "novo")}>Cadastro rápido</button>
          <button onClick={() => patchAtiva({ modo: "avulso" })} className={tab(modo === "avulso")}>Avulso</button>
        </div>
        {modo === "conhecido" ? (
          <div className="relative">
            <div className="flex gap-2">
              <input
                aria-label="Buscar catador"
                value={busca}
                onChange={(e) => { patchAtiva({ busca: e.target.value, catadorSel: null }); setMostrarSug(true); }}
                onFocus={() => setMostrarSug(true)}
                placeholder="Digite para encontrar o catador…"
                className="min-w-0 flex-1 rounded-xl border p-3 text-base"
              />
              <button
                type="button"
                onClick={() => { patchAtiva({ novoNome: busca.trim(), modo: "novo" }); setMostrarSug(false); }}
                title="Cadastrar novo catador"
                aria-label="Cadastrar novo catador"
                className="shrink-0 rounded-xl bg-marca-teal px-5 text-2xl font-black text-white active:scale-95">
                +
              </button>
            </div>
            {mostrarSug && !catadorSel && sugestoes.length > 0 ? (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border bg-white shadow-lg">
                {sugestoes.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => { patchAtiva({ catadorSel: s, busca: s.nome }); setMostrarSug(false); }}
                      className="block w-full px-4 py-3 text-left text-base hover:bg-marca-teal-light">
                      {s.nome}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {catadorEfetivo ? (
              <p className="mt-2 text-sm font-bold text-marca-teal-dark">
                Pagando para: {catadorEfetivo.nome}
                {Object.keys(precosCatador).length > 0 ? (
                  <span className="ml-1 font-semibold text-slate-500">· usando os preços dele</span>
                ) : null}
              </p>
            ) : busca.trim() !== "" ? (
              <p className="mt-2 text-sm text-amber-600">
                {resol.tipo === "ambiguo"
                  ? "Mais de um catador com esse nome — toque no certo na lista."
                  : "Toque no nome na lista ou use o + para cadastrar."}
              </p>
            ) : null}
          </div>
        ) : modo === "novo" ? (
          <div>
            <div className="flex flex-wrap gap-2">
              <input value={novoNome} onChange={(e) => patchAtiva({ novoNome: e.target.value })} placeholder="Nome do catador"
                className="min-w-[12rem] flex-1 rounded-xl border p-3 text-base" />
              <input value={novoTel} onChange={(e) => patchAtiva({ novoTel: e.target.value })} placeholder="Telefone (opcional)"
                className="min-w-[10rem] flex-1 rounded-xl border p-3 text-base" />
              <button type="button" onClick={salvarCatadorNovo} disabled={salvandoCat || novoNome.trim() === ""}
                className="shrink-0 rounded-xl bg-marca-green px-5 py-3 text-base font-black text-white active:scale-95 disabled:bg-slate-300">
                {salvandoCat ? "Salvando…" : "Salvar"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">💡 Salve o catador agora pra já usar e guardar os preços dele. (Sem internet, deixe no “Cadastro rápido” — sobe junto da compra.)</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Compra avulsa (catador não cadastrado).</p>
        )}
      </div>

      {/* grade */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-lg font-extrabold">1) Toque no material</span>
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
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {materiaisFiltrados.map((m) => (
            <button key={m.id} onClick={() => abrir(m)}
              className={`${btn} flex min-h-[84px] flex-col items-center justify-center gap-0.5 border-2 bg-white p-2 shadow-sm`}>
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span className="text-sm leading-tight">{m.nome}</span>
              <span className="text-xs font-bold text-marca-teal-dark">{formatBRL(m.preco_compra)}/{m.unidade}</span>
            </button>
          ))}
        </div>
        )}
      </div>

      {/* cesta */}
      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold">Itens desta compra — {rotuloComanda(ativa)}</div>
        {cesta.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhum item ainda.</div>
        ) : cesta.map((it, i) => (
          <div key={i} className="flex items-center gap-3 border-b p-3 last:border-0">
            <span className="text-2xl">{it.emoji}</span>
            <div className="flex-1">
              <div className="font-bold">{it.nome}</div>
              <div className="text-sm text-slate-500">
                {it.peso_liquido.toLocaleString("pt-BR")} {it.unidade} × {formatBRL(it.preco_unitario)}
                {it.peso_liquido !== it.peso_bruto ? ` (bruto ${it.peso_bruto.toLocaleString("pt-BR")})` : ""}
              </div>
            </div>
            <span className="font-extrabold">{formatBRL(it.subtotal)}</span>
            <button onClick={() => remover(i)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600">🗑️</button>
          </div>
        ))}
        {cesta.length > 0 ? (
          <div className="flex items-center justify-between rounded-b-2xl border-t p-4 text-xl font-black">
            <span className="text-slate-500">TOTAL</span><span className="text-marca-teal-dark">{formatBRL(total)}</span>
          </div>
        ) : null}
      </div>

      {msg ? <p className="text-center text-lg font-bold">{msg}</p> : null}

      {/* barra fixa: TOTAL + finalizar sempre na tela */}
      {cesta.length > 0 && !sel ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.10)] backdrop-blur">
          <div className="mx-auto max-w-5xl space-y-2 px-4 py-3">
            {catadorId != null ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
                <input type="checkbox" checked={salvarPrecos} onChange={(e) => patchAtiva({ salvarPrecos: e.target.checked })}
                  className="h-5 w-5 accent-marca-teal" />
                💾 Salvar estes preços para {catadorEfetivo?.nome} (vira o preço fixo dele)
              </label>
            ) : null}
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold uppercase text-slate-400">Total ({cesta.length} {cesta.length === 1 ? "item" : "itens"})</span>
                <span className="text-2xl font-black text-marca-navy">{formatBRL(total)}</span>
              </div>
              <button onClick={finalizar} disabled={pending}
                className="ml-auto flex-1 rounded-xl bg-marca-green p-4 text-xl font-black text-white active:scale-95 disabled:bg-slate-300">
                {pending ? "Salvando..." : "💵 FINALIZAR E PAGAR"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* teclado */}
      {sel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white">
            <div className="shrink-0 border-b px-4 pb-3 pt-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl">{sel.emoji}</span>
                <span className="text-xl font-black">{sel.nome}</span>
                <span className="ml-auto text-xs font-bold text-slate-400">tabela {formatBRL(sel.preco_compra)}/{sel.unidade}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
                  <div className="text-[11px] font-bold uppercase text-slate-500">Peso bruto ({sel.unidade})</div>
                  <div className="text-3xl font-black leading-tight">{pesoStr}</div>
                </div>
                <div className="rounded-xl bg-marca-teal-light/40 px-3 py-2 text-center">
                  <div className="text-[11px] font-bold uppercase text-slate-500">Valor (líq. {liquido.toLocaleString("pt-BR")})</div>
                  <div className="text-3xl font-black leading-tight text-marca-teal-dark">{formatBRL(valorAtual)}</div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-600">Preço (R$/{sel.unidade}):</label>
                <input
                  inputMode="decimal"
                  value={precoStr}
                  onChange={(e) => setPrecoStr(e.target.value)}
                  aria-label="Preço de compra"
                  placeholder={sel.preco_compra > 0 ? String(sel.preco_compra) : "0,00"}
                  className="w-28 rounded-lg border p-2 text-center text-lg font-bold"
                />
                {precoEdit !== sel.preco_compra ? (
                  <button type="button" onClick={() => setPrecoStr(String(sel.preco_compra))}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
                    ↺ tabela
                  </button>
                ) : null}
              </div>
              <div className="rounded-xl border-2 border-marca-teal-light bg-marca-teal-light/30 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-base font-extrabold text-marca-teal-dark">🛍️ Bags</span>
                  {descontoBag > 0 ? (
                    <span className="text-base font-black text-marca-teal-dark">− {descontoBag.toLocaleString("pt-BR")} {sel.unidade}</span>
                  ) : (
                    <span className="text-sm text-slate-400">sem desconto</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3].map((n) => (
                    <button key={n} onClick={() => escolherBags(n)} className={bagBtn(bags === n && !bagsCustom)}>{n}</button>
                  ))}
                  {bagsCustom ? (
                    <input
                      inputMode="numeric" autoFocus
                      value={bags > 0 ? String(bags) : ""}
                      onChange={(e) => bagsCustomChange(e.target.value)}
                      aria-label="Quantidade de bags"
                      placeholder="nº"
                      className="w-20 rounded-xl border-2 border-marca-teal p-2 text-center text-xl font-black"
                    />
                  ) : (
                    <button onClick={() => { setBagsCustom(true); }} className={bagBtn(bags > 3)}>
                      {bags > 3 ? `${bags} ▾` : "+mais"}
                    </button>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <label className="text-xs font-bold text-slate-500">kg/bag</label>
                    <input
                      inputMode="decimal"
                      value={kgBagStr}
                      onChange={(e) => setKgBagStr(e.target.value)}
                      aria-label="Kg por bag"
                      className="w-16 rounded-lg border p-2 text-center text-base font-bold"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">Impureza:</span>
                <button onClick={() => escolherPct(0)} className={pctBtn(pct === 0 && pctStr === "")}>0%</button>
                <button onClick={() => escolherPct(5)} className={pctBtn(pct === 5 && pctStr === "")}>5%</button>
                <button onClick={() => escolherPct(10)} className={pctBtn(pct === 10 && pctStr === "")}>10%</button>
                <input inputMode="decimal" value={pctStr} onChange={(e) => pctCustom(e.target.value)}
                  placeholder="outro %" className="w-20 rounded-lg border p-1.5 text-center text-sm" />
              </div>
            </div>

            <div className="shrink-0 border-t px-4 pb-4 pt-2">
              <div className="grid grid-cols-3 gap-2">
                {["7","8","9","4","5","6","1","2","3",",","0","back"].map((k) => (
                  <button key={k} onClick={() => tecla(k)} className={`${btn} bg-slate-100 p-3 text-2xl ${k === "back" ? "text-red-600" : ""}`}>
                    {k === "back" ? "⌫" : k}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button onClick={fecharModal} className={`${btn} bg-slate-200 p-3 text-lg`}>Cancelar</button>
                <button onClick={adicionar} className={`${btn} col-span-2 bg-marca-green p-3 text-xl text-white`}>✅ Adicionar item</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
