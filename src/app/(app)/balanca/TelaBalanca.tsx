"use client";

import { useMemo, useState, useTransition } from "react";
import { formatBRL, calcSubtotal } from "@/lib/format";
import { calcTotalCompra } from "@/lib/compra";
import { registrarCompra } from "./actions";
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
  const [pct, setPct] = useState(0); // % de impureza
  const [pctStr, setPctStr] = useState(""); // campo custom
  const [modo, setModo] = useState<ModoCatador>("conhecido");
  const [catadorId, setCatadorId] = useState<number | "">("");
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  const peso = parseFloat(pesoStr.replace(",", ".")) || 0;
  const liquido = r3(peso * (1 - pct / 100));
  const valorAtual = sel ? calcSubtotal(liquido, sel.preco_compra) : 0;
  const total = useMemo(() => calcTotalCompra(cesta), [cesta]);

  function abrir(m: Material) {
    setSel(m); setPesoStr("0"); setPct(0); setPctStr("");
  }
  function tecla(k: string) {
    setPesoStr((c) => (k === "back" ? (c.length > 1 ? c.slice(0, -1) : "0") : k === "," ? (c.includes(",") ? c : c + ",") : c === "0" ? k : c + k));
  }
  function escolherPct(p: number) { setPct(p); setPctStr(""); }
  function pctCustom(v: string) {
    setPctStr(v);
    const n = parseFloat(v.replace(",", "."));
    setPct(Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0);
  }
  function adicionar() {
    if (!sel || liquido <= 0) { setMsg("Digite o peso"); return; }
    setCesta((c) => [...c, {
      material_id: sel.id, nome: sel.nome, emoji: sel.emoji, unidade: sel.unidade,
      preco_unitario: sel.preco_compra, peso_bruto: peso, peso_liquido: liquido,
      subtotal: calcSubtotal(liquido, sel.preco_compra),
    }]);
    setSel(null); setMsg("");
  }
  function remover(i: number) { setCesta((c) => c.filter((_, idx) => idx !== i)); }

  function resolverCatador(): { pessoa_id: number | null; nome: string; tel: string } | null {
    if (modo === "avulso") {
      if (avulsoId) return { pessoa_id: avulsoId, nome: "", tel: "" };
      return { pessoa_id: null, nome: "Avulso", tel: "" };
    }
    if (modo === "novo") {
      if (novoNome.trim() === "") return null;
      return { pessoa_id: null, nome: novoNome.trim(), tel: novoTel.trim() };
    }
    if (catadorId === "") return null;
    return { pessoa_id: Number(catadorId), nome: "", tel: "" };
  }

  function finalizar() {
    if (cesta.length === 0) return;
    const cat = resolverCatador();
    if (!cat) { setMsg("Escolha ou cadastre o catador"); return; }
    startTransition(async () => {
      const res = await registrarCompra({
        pessoa_id: cat.pessoa_id, catador_nome: cat.nome, catador_telefone: cat.tel,
        observacoes: "",
        itens: cesta.map((i) => ({ material_id: i.material_id, peso_bruto: i.peso_bruto, peso_liquido: i.peso_liquido, preco_unitario: i.preco_unitario })),
      });
      if (res.ok) {
        setMsg(`✅ Compra salva — ${formatBRL(total)}`);
        setCesta([]); setNovoNome(""); setNovoTel(""); setCatadorId("");
      } else setMsg("Erro: " + res.erro);
    });
  }

  const btn = "rounded-xl text-xl font-extrabold active:scale-95 transition-transform";
  const tab = (on: boolean) => "rounded-full px-4 py-2 text-sm font-bold " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-600");
  const pctBtn = (on: boolean) => "rounded-xl px-4 py-3 text-lg font-extrabold " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-700");

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
          <select value={catadorId} onChange={(e) => setCatadorId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-xl border p-3 text-base">
            <option value="">Selecione o catador…</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
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
        <div className="mb-2 text-lg font-extrabold">1) Toque no material</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {materiais.map((m) => (
            <button key={m.id} onClick={() => abrir(m)}
              className={`${btn} flex min-h-[110px] flex-col items-center justify-center gap-1 border-2 bg-white p-3 shadow-sm`}>
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-lg">{m.nome}</span>
              <span className="text-sm font-bold text-marca-teal-dark">{formatBRL(m.preco_compra)}/{m.unidade}</span>
            </button>
          ))}
        </div>
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
              <span className="ml-auto font-bold text-marca-teal-dark">{formatBRL(sel.preco_compra)}/{sel.unidade}</span>
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
            {/* impureza % */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-600">Impureza:</span>
              <button onClick={() => escolherPct(0)} className={pctBtn(pct === 0 && pctStr === "")}>0%</button>
              <button onClick={() => escolherPct(5)} className={pctBtn(pct === 5 && pctStr === "")}>5%</button>
              <button onClick={() => escolherPct(10)} className={pctBtn(pct === 10 && pctStr === "")}>10%</button>
              <input inputMode="decimal" value={pctStr} onChange={(e) => pctCustom(e.target.value)}
                placeholder="outro %" className="w-24 rounded-lg border p-2 text-center text-lg" />
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
