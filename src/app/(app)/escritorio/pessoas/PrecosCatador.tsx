"use client";

import { useState, useTransition } from "react";
import { salvarPrecosCatador } from "../../balanca/actions";

export type MaterialPreco = {
  id: number;
  nome: string;
  emoji: string | null;
  unidade: string;
  preco_compra: number; // preço de tabela
};

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

export function PrecosCatador({
  pessoaId, materiais, precosIniciais,
}: {
  pessoaId: number;
  materiais: MaterialPreco[];
  precosIniciais: Record<number, number>;
}) {
  const [precos, setPrecos] = useState<Record<number, string>>(() => {
    const o: Record<number, string> = {};
    for (const m of materiais) {
      o[m.id] = precosIniciais[m.id] != null ? String(precosIniciais[m.id]).replace(".", ",") : "";
    }
    return o;
  });
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);
  const [pending, start] = useTransition();

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const filtrados = busca.trim() ? materiais.filter((m) => norm(m.nome).includes(norm(busca))) : materiais;
  const definidos = materiais.filter((m) => precos[m.id]?.trim()).length;

  function salvar() {
    start(async () => {
      const payload = materiais.map((m) => {
        const v = precos[m.id]?.trim();
        return { material_id: m.id, preco: v ? num(v) : null };
      });
      const res = await salvarPrecosCatador(pessoaId, payload);
      setMsg(res.ok ? { ok: true, txt: "✅ Preços salvos" } : { ok: false, txt: res.erro ?? "Erro ao salvar" });
    });
  }

  return (
    <div className="rounded-2xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 p-3">
        <div>
          <span className="font-bold text-marca-navy">💲 Preços deste catador</span>
          <p className="text-xs text-slate-500">Vazio = usa o preço de tabela. {definidos} com preço próprio.</p>
        </div>
        <button onClick={salvar} disabled={pending}
          className="rounded-full bg-marca-green px-5 py-2 text-sm font-bold text-white disabled:bg-slate-300">
          {pending ? "Salvando…" : "💾 Salvar preços"}
        </button>
      </div>

      <div className="p-3">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔎 Buscar material…"
          className="mb-3 w-full rounded-xl border p-2 text-sm" />
        <div className="grid gap-2 sm:grid-cols-2">
          {filtrados.map((m) => (
            <label key={m.id} className="flex items-center gap-2 rounded-xl border p-2">
              <span className="text-xl">{m.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m.nome}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">R$</span>
                <input inputMode="decimal" value={precos[m.id] ?? ""}
                  onChange={(e) => setPrecos((p) => ({ ...p, [m.id]: e.target.value }))}
                  placeholder={m.preco_compra > 0 ? String(m.preco_compra).replace(".", ",") : "0,00"}
                  aria-label={`Preço de ${m.nome}`}
                  className="w-20 rounded-lg border p-1.5 text-center text-sm font-bold" />
                <span className="w-10 text-[11px] text-slate-400">/{m.unidade}</span>
              </div>
            </label>
          ))}
        </div>
        {msg ? (
          <p className={"mt-3 text-sm font-bold " + (msg.ok ? "text-marca-green-dark" : "text-red-600")}>{msg.txt}</p>
        ) : null}
        <p className="mt-3 text-xs text-slate-400">
          Dica: dá pra preencher rápido na própria balança marcando “salvar preços deste catador” ao finalizar uma compra.
        </p>
      </div>
    </div>
  );
}
