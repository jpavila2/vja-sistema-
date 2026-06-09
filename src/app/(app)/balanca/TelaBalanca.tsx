"use client";

import { useMemo, useState, useTransition } from "react";
import { formatBRL, calcSubtotal } from "@/lib/format";
import { calcTotalCompra, pesoLiquido } from "@/lib/compra";
import { registrarCompra } from "./actions";
import { buscarCatadores, resolverCatador, type CatadorOpt } from "@/lib/catador";
import type { Material, ItemCesta, Pessoa } from "@/lib/types";

type Props = {
  materiais: Material[];
  fornecedores: Pick<Pessoa, "id" | "nome">[];
  avulsoId: number | null;
};
type ModoCatador = "conhecido" | "novo" | "avulso";

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export function TelaBalanca({ materiais, fornecedores, avulsoId }: Props) {
  const [cesta, setCesta] = useState<ItemCesta[]>([]);
  const [sel, setSel] = useState<Material | null>(null);
  const [pesoStr, setPesoStr] = useState("0");
  const [precoStr, setPrecoStr] = useState(""); // preço de compra editável (preço especial)
  const [bags, setBags] = useState(0); // nº de big bags (cada bag desconta kgBag do bruto)
  const [kgBagStr, setKgBagStr] = useState("3"); // kg descontado por bag (padrão 3)
  const [bagsCustom, setBagsCustom] = useState(false); // campo "+mais" aberto
  const [pct, setPct] = useState(0); // % de impureza
  const [pctStr, setPctStr] = useState(""); // campo custom
  const [modo, setModo] = useState<ModoCatador>("conhecido");
  const [busca, setBusca] = useState("");
  const [catadorSel, setCatadorSel] = useState<CatadorOpt | null>(null);
  const [mostrarSug, setMostrarSug] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [msg, setMsg] = useState("");
  const [buscaMat, setBuscaMat] = useState("");
  const [reqId, setReqId] = useState<string>(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const materiaisFiltrados = buscaMat.trim()
    ? materiais.filter((m) => norm(m.nome).includes(norm(buscaMat)))
    : materiais;

  // catador resolvido para exibir "Pagando para" e travar lançamento no errado
  const sugestoes = buscarCatadores(fornecedores, busca);
  const resol = resolverCatador(fornecedores, busca);
  const catadorEfetivo: CatadorOpt | null =
    catadorSel ?? (resol.tipo === "ok" ? { id: resol.id, nome: resol.nome } : null);

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
    setPrecoStr(m.preco_compra > 0 ? String(m.preco_compra) : "");
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
  function adicionar() {
    if (!sel || liquido <= 0) { setMsg("Digite o peso"); return; }
    if (precoEdit < 0) { setMsg("Preço inválido"); return; }
    setCesta((c) => [...c, {
      material_id: sel.id, nome: sel.nome, emoji: sel.emoji, unidade: sel.unidade,
      preco_unitario: precoEdit, peso_bruto: peso, peso_liquido: liquido,
      subtotal: calcSubtotal(liquido, precoEdit),
    }]);
    setSel(null); setMsg("");
  }
  function remover(i: number) { setCesta((c) => c.filter((_, idx) => idx !== i)); }

  function obterCatadorPayload(): { pessoa_id: number | null; nome: string; tel: string } | null {
    if (modo === "avulso") {
      if (avulsoId) return { pessoa_id: avulsoId, nome: "", tel: "" };
      return { pessoa_id: null, nome: "Avulso", tel: "" };
    }
    if (modo === "novo") {
      if (novoNome.trim() === "") return null;
      return { pessoa_id: null, nome: novoNome.trim(), tel: novoTel.trim() };
    }
    if (catadorEfetivo) return { pessoa_id: catadorEfetivo.id, nome: "", tel: "" };
    return null;
  }

  function msgCatador(): string {
    if (modo === "novo") return "Digite o nome do catador";
    if (resol.tipo === "ambiguo") return "Há mais de um catador com esse nome — toque no certo na lista";
    return "Toque no nome do catador na lista ou use o + para cadastrar";
  }

  function finalizar() {
    if (pending) return; // trava duplo-clique
    if (cesta.length === 0) return;
    const cat = obterCatadorPayload();
    if (!cat) { setMsg(msgCatador()); return; }
    startTransition(async () => {
      try {
        const res = await registrarCompra({
          pessoa_id: cat.pessoa_id, catador_nome: cat.nome, catador_telefone: cat.tel,
          observacoes: "",
          itens: cesta.map((i) => ({ material_id: i.material_id, peso_bruto: i.peso_bruto, peso_liquido: i.peso_liquido, preco_unitario: i.preco_unitario })),
          client_request_id: reqId,
        });
        if (res.ok) {
          setMsg(`✅ Compra salva — ${formatBRL(total)}`);
          setCesta([]); setNovoNome(""); setNovoTel(""); setBusca("");
          setCatadorSel(null); setMostrarSug(false); setModo("conhecido");
          setReqId(crypto.randomUUID()); // nova chave para a próxima compra
        } else setMsg("Erro: " + res.erro);
      } catch (e) {
        setMsg("Erro ao salvar — tente de novo. " + (e instanceof Error ? e.message : ""));
      }
    });
  }

  const btn = "rounded-xl text-xl font-extrabold active:scale-95 transition-transform";
  const tab = (on: boolean) => "rounded-full px-4 py-2 text-sm font-bold " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-600");
  const bagBtn = (on: boolean) => "rounded-xl px-5 py-3 text-xl font-black active:scale-95 " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-700");
  const pctBtn = (on: boolean) => "rounded-lg px-3 py-1.5 text-sm font-bold " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-600");

  return (
    <div className="space-y-4">
      {/* catador */}
      <div className="rounded-2xl border bg-white p-3">
        <div className="mb-2 flex gap-2">
          <button onClick={() => setModo("conhecido")} className={tab(modo === "conhecido")}>Cadastrado</button>
          <button onClick={() => setModo("novo")} className={tab(modo === "novo")}>Cadastro rápido</button>
          <button onClick={() => setModo("avulso")} className={tab(modo === "avulso")}>Avulso</button>
        </div>
        {modo === "conhecido" ? (
          <div className="relative">
            <div className="flex gap-2">
              <input
                aria-label="Buscar catador"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setCatadorSel(null); setMostrarSug(true); }}
                onFocus={() => setMostrarSug(true)}
                placeholder="Digite para encontrar o catador…"
                className="min-w-0 flex-1 rounded-xl border p-3 text-base"
              />
              <button
                type="button"
                onClick={() => { setNovoNome(busca.trim()); setMostrarSug(false); setModo("novo"); }}
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
                      onClick={() => { setCatadorSel(s); setBusca(s.nome); setMostrarSug(false); }}
                      className="block w-full px-4 py-3 text-left text-base hover:bg-marca-teal-light">
                      {s.nome}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {catadorEfetivo ? (
              <p className="mt-2 text-sm font-bold text-marca-teal-dark">Pagando para: {catadorEfetivo.nome}</p>
            ) : busca.trim() !== "" ? (
              <p className="mt-2 text-sm text-amber-600">
                {resol.tipo === "ambiguo"
                  ? "Mais de um catador com esse nome — toque no certo na lista."
                  : "Toque no nome na lista ou use o + para cadastrar."}
              </p>
            ) : null}
          </div>
        ) : modo === "novo" ? (
          <div className="flex flex-wrap gap-2">
            <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do catador"
              className="min-w-[12rem] flex-1 rounded-xl border p-3 text-base" />
            <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="Telefone (opcional)"
              className="min-w-[10rem] flex-1 rounded-xl border p-3 text-base" />
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {materiaisFiltrados.map((m) => (
            <button key={m.id} onClick={() => abrir(m)}
              className={`${btn} flex min-h-[110px] flex-col items-center justify-center gap-1 border-2 bg-white p-3 shadow-sm`}>
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-lg">{m.nome}</span>
              <span className="text-sm font-bold text-marca-teal-dark">{formatBRL(m.preco_compra)}/{m.unidade}</span>
            </button>
          ))}
        </div>
        )}
      </div>

      {/* cesta */}
      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold">Itens desta compra</div>
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
        <div className="flex items-center justify-between p-4 text-2xl font-black">
          <span>TOTAL</span><span className="text-marca-teal-dark">{formatBRL(total)}</span>
        </div>
        <button onClick={finalizar} disabled={cesta.length === 0 || pending}
          className="w-full rounded-b-2xl bg-marca-green p-5 text-2xl font-black text-white disabled:bg-slate-300">
          {pending ? "Salvando..." : `💵 FINALIZAR E PAGAR ${cesta.length ? "(" + formatBRL(total) + ")" : ""}`}
        </button>
      </div>

      {msg ? <p className="text-center text-lg font-bold">{msg}</p> : null}

      {/* teclado */}
      {sel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-t-3xl bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl">{sel.emoji}</span>
              <span className="text-2xl font-black">{sel.nome}</span>
              <span className="ml-auto text-sm font-bold text-slate-400">tabela {formatBRL(sel.preco_compra)}/{sel.unidade}</span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-xs font-bold uppercase text-slate-500">Peso bruto ({sel.unidade})</div>
                <div className="text-4xl font-black">{pesoStr}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-xs font-bold uppercase text-slate-500">Valor (líq. {liquido.toLocaleString("pt-BR")})</div>
                <div className="text-4xl font-black text-marca-teal-dark">{formatBRL(valorAtual)}</div>
              </div>
            </div>
            {/* preço de compra editável (preço especial pro catador) */}
            <div className="mb-3 flex items-center gap-2">
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
            {/* desconto por bag (big bag) — em destaque */}
            <div className="mb-3 rounded-xl border-2 border-marca-teal-light bg-marca-teal-light/30 p-3">
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
            {/* impureza % — secundário, menor, embaixo */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400">Impureza:</span>
              <button onClick={() => escolherPct(0)} className={pctBtn(pct === 0 && pctStr === "")}>0%</button>
              <button onClick={() => escolherPct(5)} className={pctBtn(pct === 5 && pctStr === "")}>5%</button>
              <button onClick={() => escolherPct(10)} className={pctBtn(pct === 10 && pctStr === "")}>10%</button>
              <input inputMode="decimal" value={pctStr} onChange={(e) => pctCustom(e.target.value)}
                placeholder="outro %" className="w-20 rounded-lg border p-1.5 text-center text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["7","8","9","4","5","6","1","2","3",",","0","back"].map((k) => (
                <button key={k} onClick={() => tecla(k)} className={`${btn} bg-slate-100 p-4 text-2xl ${k === "back" ? "text-red-600" : ""}`}>
                  {k === "back" ? "⌫" : k}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => setSel(null)} className={`${btn} bg-slate-200 p-4 text-lg`}>Cancelar</button>
              <button onClick={adicionar} className={`${btn} col-span-2 bg-marca-green p-4 text-xl text-white`}>✅ Adicionar item</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
