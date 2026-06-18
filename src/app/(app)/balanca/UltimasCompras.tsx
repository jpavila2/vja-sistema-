"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import type { Recibo } from "@/lib/useRecibos";

const horaBR = (ms: number) =>
  new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

/** Botão + modal com o histórico local das últimas compras deste aparelho. */
export function UltimasCompras({ recibos }: { recibos: Recibo[] }) {
  const [aberto, setAberto] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex shrink-0 items-center gap-1 rounded-full border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
      >
        🧾 Últimas compras
      </button>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAberto(false)}>
          <div
            className="flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-3xl bg-white sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b p-4">
              <span className="text-lg font-black text-marca-navy">🧾 Últimas compras (deste aparelho)</span>
              <button onClick={() => setAberto(false)} aria-label="Fechar"
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">✕</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {recibos.length === 0 ? (
                <p className="p-6 text-center text-slate-400">Nenhuma compra finalizada ainda neste aparelho.</p>
              ) : (
                <ul className="space-y-2">
                  {recibos.map((r) => {
                    const aberto = expandido === r.id;
                    return (
                      <li key={r.id} className="rounded-2xl border bg-white">
                        <button onClick={() => setExpandido(aberto ? null : r.id)}
                          className="flex w-full items-center gap-3 p-3 text-left">
                          <div className="flex-1">
                            <div className="font-bold text-marca-navy">{r.catador || "Avulso"}</div>
                            <div className="text-xs text-slate-500">
                              {horaBR(r.quando)} · {r.itens.length} item(ns)
                              {r.status === "fila" ? (
                                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">📤 aguardando internet</span>
                              ) : (
                                <span className="ml-1 rounded-full bg-marca-teal-light px-2 py-0.5 font-bold text-marca-teal-dark">✓ no sistema</span>
                              )}
                            </div>
                          </div>
                          <span className="text-lg font-black text-marca-teal-dark">{formatBRL(r.total)}</span>
                          <span className="text-slate-400">{aberto ? "▴" : "▾"}</span>
                        </button>
                        {aberto ? (
                          <ul className="border-t px-3 py-2 text-sm">
                            {r.itens.map((it, i) => (
                              <li key={i} className="flex items-center gap-2 py-0.5">
                                <span>{it.emoji}</span>
                                <span className="flex-1 text-slate-600">
                                  {it.nome}: {it.peso.toLocaleString("pt-BR")} {it.unidade} × {formatBRL(it.preco)}
                                </span>
                                <span className="font-bold">{formatBRL(it.subtotal)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
