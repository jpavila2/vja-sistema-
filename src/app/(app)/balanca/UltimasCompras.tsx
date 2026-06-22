"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import type { Recibo } from "@/lib/useRecibos";
import { ultimasCompras, type CompraRecente } from "./actions";

const horaBR = (ms: number) =>
  new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

type Linha = {
  chave: string;
  quando: number;
  catador: string;
  total: number;
  itens: { nome: string; emoji: string | null; unidade: string; peso: number; preco: number; subtotal: number }[];
  status: "sistema" | "fila" | "cancelada";
};

function deServidor(c: CompraRecente): Linha {
  return {
    chave: "s" + c.id,
    quando: new Date(c.quando).getTime(),
    catador: c.catador || "Avulso",
    total: Number(c.total),
    itens: c.itens ?? [],
    status: c.status === "cancelada" ? "cancelada" : "sistema",
  };
}
function deLocal(r: Recibo): Linha {
  return {
    chave: "l" + r.id,
    quando: r.quando,
    catador: r.catador || "Avulso",
    total: r.total,
    itens: r.itens,
    status: "fila",
  };
}

/** Botão + modal com as últimas compras (de qualquer aparelho) + pendentes locais. */
export function UltimasCompras({ recibos }: { recibos: Recibo[] }) {
  const [aberto, setAberto] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  async function abrir() {
    setAberto(true);
    setCarregando(true);
    setErro(false);
    const servidor = await ultimasCompras();
    if (servidor.length === 0 && recibos.length > 0) {
      // sem internet/sem retorno: cai pro histórico local
      setErro(true);
      setLinhas(recibos.map(deLocal));
    } else {
      const idsServidor = new Set(servidor.map((c) => c.client_request_id).filter(Boolean));
      const pendentesLocais = recibos
        .filter((r) => r.status === "fila" && !idsServidor.has(r.id))
        .map(deLocal);
      setLinhas([...pendentesLocais, ...servidor.map(deServidor)].sort((a, b) => b.quando - a.quando));
    }
    setCarregando(false);
  }

  return (
    <>
      <button onClick={abrir}
        className="flex shrink-0 items-center gap-1 rounded-full border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
        🧾 Últimas compras
      </button>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAberto(false)}>
          <div className="flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-3xl bg-white sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b p-4">
              <span className="text-lg font-black text-marca-navy">🧾 Últimas compras</span>
              <button onClick={() => setAberto(false)} aria-label="Fechar"
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">✕</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {carregando ? (
                <p className="p-6 text-center text-slate-400">Carregando…</p>
              ) : linhas.length === 0 ? (
                <p className="p-6 text-center text-slate-400">Nenhuma compra recente.</p>
              ) : (
                <>
                  {erro ? (
                    <p className="mb-2 rounded-lg bg-amber-50 p-2 text-center text-xs font-bold text-amber-700">
                      Sem internet — mostrando só as compras deste aparelho.
                    </p>
                  ) : null}
                  <ul className="space-y-2">
                    {linhas.map((r) => {
                      const aberta = expandido === r.chave;
                      return (
                        <li key={r.chave} className={"rounded-2xl border bg-white " + (r.status === "cancelada" ? "opacity-50" : "")}>
                          <button onClick={() => setExpandido(aberta ? null : r.chave)}
                            className="flex w-full items-center gap-3 p-3 text-left">
                            <div className="flex-1">
                              <div className="font-bold text-marca-navy">{r.catador}</div>
                              <div className="text-xs text-slate-500">
                                {horaBR(r.quando)} · {r.itens.length} item(ns)
                                {r.status === "fila" ? (
                                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">📤 aguardando internet</span>
                                ) : r.status === "cancelada" ? (
                                  <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-600">cancelada</span>
                                ) : (
                                  <span className="ml-1 rounded-full bg-marca-teal-light px-2 py-0.5 font-bold text-marca-teal-dark">✓ no sistema</span>
                                )}
                              </div>
                            </div>
                            <span className="text-lg font-black text-marca-teal-dark">{formatBRL(r.total)}</span>
                            <span className="text-slate-400">{aberta ? "▴" : "▾"}</span>
                          </button>
                          {aberta ? (
                            <ul className="border-t px-3 py-2 text-sm">
                              {r.itens.map((it, i) => (
                                <li key={i} className="flex items-center gap-2 py-0.5">
                                  <span>{it.emoji}</span>
                                  <span className="flex-1 text-slate-600">
                                    {it.nome}: {Number(it.peso).toLocaleString("pt-BR")} {it.unidade} × {formatBRL(Number(it.preco))}
                                  </span>
                                  <span className="font-bold">{formatBRL(Number(it.subtotal))}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
