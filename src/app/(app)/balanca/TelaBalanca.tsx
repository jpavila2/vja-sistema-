"use client";

import { useMemo, useState, useTransition } from "react";
import { formatBRL, calcSubtotal } from "@/lib/format";
import { calcTotalCompra } from "@/lib/compra";
import { registrarCompra } from "./actions";
import type { Material, ItemCesta, Pessoa } from "@/lib/types";

type Props = { materiais: Material[]; fornecedores: Pick<Pessoa, "id" | "nome">[] };

export function TelaBalanca({ materiais, fornecedores }: Props) {
  const [cesta, setCesta] = useState<ItemCesta[]>([]);
  const [sel, setSel] = useState<Material | null>(null);
  const [pesoStr, setPesoStr] = useState("0");
  const [liqStr, setLiqStr] = useState<string | null>(null);
  const [catador, setCatador] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  const peso = parseFloat(pesoStr.replace(",", ".")) || 0;
  const liquido = liqStr === null ? peso : parseFloat(liqStr.replace(",", ".")) || 0;
  const valorAtual = sel ? calcSubtotal(liquido, sel.preco_compra) : 0;
  const total = useMemo(() => calcTotalCompra(cesta), [cesta]);

  function abrir(m: Material) {
    setSel(m);
    setPesoStr("0");
    setLiqStr(null);
  }
  function tecla(k: string) {
    setPesoStr((cur) => {
      if (k === "back") return cur.length > 1 ? cur.slice(0, -1) : "0";
      if (k === ",") return cur.includes(",") ? cur : cur + ",";
      return cur === "0" ? k : cur + k;
    });
    setLiqStr(null);
  }
  function adicionar() {
    if (!sel || liquido <= 0) {
      setMsg("Digite o peso");
      return;
    }
    const it: ItemCesta = {
      material_id: sel.id, nome: sel.nome, emoji: sel.emoji, unidade: sel.unidade,
      preco_unitario: sel.preco_compra, peso_bruto: peso, peso_liquido: liquido,
      subtotal: calcSubtotal(liquido, sel.preco_compra),
    };
    setCesta((c) => [...c, it]);
    setSel(null);
    setMsg("");
  }
  function remover(i: number) {
    setCesta((c) => c.filter((_, idx) => idx !== i));
  }
  function finalizar() {
    if (cesta.length === 0) return;
    if (catador.trim() === "") {
      setMsg("Informe o catador antes de finalizar");
      return;
    }
    const conhecido = fornecedores.find(
      (f) => f.nome.toLowerCase() === catador.trim().toLowerCase(),
    );
    startTransition(async () => {
      const res = await registrarCompra({
        pessoa_id: conhecido ? conhecido.id : null,
        catador_nome: conhecido ? "" : catador.trim(),
        observacoes: "",
        itens: cesta.map((i) => ({
          material_id: i.material_id, peso_bruto: i.peso_bruto,
          peso_liquido: i.peso_liquido, preco_unitario: i.preco_unitario,
        })),
      });
      if (res.ok) {
        setMsg(`✅ Compra salva — ${catador.trim()} — ${formatBRL(total)}`);
        setCesta([]);
        setCatador("");
      } else {
        setMsg("Erro: " + res.erro);
      }
    });
  }

  const btn = "rounded-xl text-xl font-extrabold active:scale-95 transition-transform";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-slate-700">Catador:</span>
        <input
          list="fornecedores"
          value={catador}
          onChange={(e) => setCatador(e.target.value)}
          placeholder="Nome do catador"
          className="min-w-[14rem] flex-1 rounded-xl border p-3 text-base"
        />
        <datalist id="fornecedores">
          {fornecedores.map((f) => (
            <option key={f.id} value={f.nome} />
          ))}
        </datalist>
      </div>

      <div>
        <div className="mb-2 text-lg font-extrabold">1) Toque no material</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {materiais.map((m) => (
            <button
              key={m.id}
              onClick={() => abrir(m)}
              className={`${btn} flex min-h-[110px] flex-col items-center justify-center gap-1 border-2 bg-white p-3 shadow-sm`}
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-lg">{m.nome}</span>
              <span className="text-sm font-bold text-marca-teal-dark">
                {formatBRL(m.preco_compra)}/{m.unidade}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold">Itens desta compra</div>
        {cesta.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhum item ainda.</div>
        ) : (
          cesta.map((it, i) => (
            <div key={i} className="flex items-center gap-3 border-b p-3 last:border-0">
              <span className="text-2xl">{it.emoji}</span>
              <div className="flex-1">
                <div className="font-bold">{it.nome}</div>
                <div className="text-sm text-slate-500">
                  {it.peso_liquido.toLocaleString("pt-BR")} {it.unidade} × {formatBRL(it.preco_unitario)}
                  {it.peso_liquido !== it.peso_bruto
                    ? ` (bruto ${it.peso_bruto.toLocaleString("pt-BR")})`
                    : ""}
                </div>
              </div>
              <span className="font-extrabold">{formatBRL(it.subtotal)}</span>
              <button onClick={() => remover(i)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600">
                🗑️
              </button>
            </div>
          ))
        )}
        <div className="flex items-center justify-between p-4 text-2xl font-black">
          <span>TOTAL</span>
          <span className="text-marca-teal-dark">{formatBRL(total)}</span>
        </div>
        <button
          onClick={finalizar}
          disabled={cesta.length === 0 || pending}
          className="w-full rounded-b-2xl bg-marca-green p-5 text-2xl font-black text-white disabled:bg-slate-300"
        >
          {pending ? "Salvando..." : `💵 FINALIZAR E PAGAR ${cesta.length ? "(" + formatBRL(total) + ")" : ""}`}
        </button>
      </div>

      {msg ? <p className="text-center text-lg font-bold">{msg}</p> : null}

      {sel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-t-3xl bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl">{sel.emoji}</span>
              <span className="text-2xl font-black">{sel.nome}</span>
              <span className="ml-auto font-bold text-marca-teal-dark">
                {formatBRL(sel.preco_compra)}/{sel.unidade}
              </span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-xs font-bold uppercase text-slate-500">Peso ({sel.unidade})</div>
                <div className="text-4xl font-black">{pesoStr}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-xs font-bold uppercase text-slate-500">Valor</div>
                <div className="text-4xl font-black text-marca-teal-dark">{formatBRL(valorAtual)}</div>
              </div>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">Peso líquido (impureza):</span>
              <input
                inputMode="decimal"
                value={liqStr ?? String(peso).replace(".", ",")}
                onChange={(e) => setLiqStr(e.target.value)}
                className="w-28 rounded-lg border p-2 text-center text-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", ",", "0", "back"].map((k) => (
                <button
                  key={k}
                  onClick={() => tecla(k)}
                  className={`${btn} bg-slate-100 p-4 text-2xl ${k === "back" ? "text-red-600" : ""}`}
                >
                  {k === "back" ? "⌫" : k}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => setSel(null)} className={`${btn} bg-slate-200 p-4 text-lg`}>
                Cancelar
              </button>
              <button onClick={adicionar} className={`${btn} col-span-2 bg-marca-green p-4 text-xl text-white`}>
                ✅ Adicionar item
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
