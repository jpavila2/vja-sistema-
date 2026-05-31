import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { calcularSaldoCaixa } from "@/lib/caixa-fisico";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoAbrir, FormSaque, FormDespesa, FormFechar } from "./FormsCaixa";
import { removerMovimento } from "./actions";

export default async function CaixaPage({ searchParams }: { searchParams: { dia?: string } }) {
  const dia = searchParams.dia ?? hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();

  const [{ data: sessao }, { data: movs }, { data: compras }, { data: comprasPixData }] = await Promise.all([
    supabase.from("cash_sessions").select("*").eq("dia", dia).maybeSingle(),
    supabase.from("cash_movements").select("*").eq("dia", dia).order("created_at"),
    supabase.from("purchases").select("total, status").eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
    supabase.from("purchases").select("total, status").eq("forma_pagamento", "pix").gte("data_hora", inicio).lt("data_hora", fim),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const movimentos = (movs as any[]) ?? [];
  const saques = movimentos.filter((m) => m.tipo === "saque");
  const despesas = movimentos.filter((m) => m.tipo === "despesa");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comprasDin = ((compras as any[]) ?? []).filter((c) => c.status !== "cancelada");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comprasPix = ((comprasPixData as any[]) ?? []).filter((c) => c.status !== "cancelada");
  const totalPix = Math.round(comprasPix.reduce((s, c) => s + Number(c.total), 0) * 100) / 100;

  const r = calcularSaldoCaixa({
    saldoInicial: sessao?.saldo_inicial ?? 0,
    saques: saques.map((m) => Number(m.valor)),
    comprasDinheiro: comprasDin.map((c) => Number(c.total)),
    despesas: despesas.map((m) => Number(m.valor)),
    contado: sessao?.saldo_contado ?? undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Caixa do dia</h1>
        <form><input type="date" name="dia" defaultValue={dia} className="rounded-xl border p-2" /></form>
      </div>

      {!sessao ? (
        <div className="rounded-2xl border bg-white p-6 text-center">
          <p className="mb-3 text-slate-500">O caixa de {new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR")} ainda não foi aberto.</p>
          <BotaoAbrir dia={dia} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <CardResumo titulo="Saldo inicial" valor={formatBRL(sessao.saldo_inicial)} cor="navy" />
            <CardResumo titulo="Saques (entrada)" valor={formatBRL(r.totalSaques)} cor="green" />
            <CardResumo titulo="Saídas (compras+despesas)" valor={formatBRL(r.totalCompras + r.totalDespesas)} cor="gold" />
            <CardResumo titulo="Saldo calculado" valor={formatBRL(r.saldoCalculado)} cor="teal" />
          </div>

          {sessao.status === "fechado" ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-bold text-marca-navy">Caixa fechado</div>
              <div className="text-sm">Contado: <b>{formatBRL(sessao.saldo_contado)}</b> · Diferença:{" "}
                <b className={(r.diferenca ?? 0) === 0 ? "text-marca-green-dark" : "text-red-600"}>
                  {formatBRL(r.diferenca ?? 0)} {(r.diferenca ?? 0) > 0 ? "(sobra)" : (r.diferenca ?? 0) < 0 ? "(falta)" : ""}
                </b>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border bg-white p-4">
              <FormSaque dia={dia} />
              <FormDespesa dia={dia} />
              <div className="border-t pt-3"><FormFechar dia={dia} /></div>
            </div>
          )}

          {/* compras em dinheiro (auto) */}
          <div className="rounded-2xl border bg-white">
            <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Compras em dinheiro (automático) — {formatBRL(r.totalCompras)}</div>
            {comprasDin.length === 0 ? <div className="p-4 text-center text-slate-400">Nenhuma.</div> :
              <div className="p-3 text-sm text-slate-600">{comprasDin.length} compra(s) somando {formatBRL(r.totalCompras)} (saíram da gaveta)</div>}
          </div>

          {/* compras em PIX (não afetam o caixa físico) */}
          {comprasPix.length > 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-3 text-sm text-slate-500">
              💳 {comprasPix.length} compra(s) via <b>PIX</b> somando {formatBRL(totalPix)} — não saíram da gaveta, não entram no caixa físico.
            </div>
          ) : null}

          {/* lançamentos manuais */}
          <div className="rounded-2xl border bg-white">
            <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Lançamentos do dia</div>
            {movimentos.length === 0 ? <div className="p-4 text-center text-slate-400">Nenhum saque/despesa.</div> :
              movimentos.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border-b p-3 last:border-0">
                  <span className={"rounded-full px-2 py-0.5 text-xs font-bold " + (m.tipo === "saque" ? "bg-marca-green-dark/10 text-marca-green-dark" : "bg-marca-gold-light text-marca-gold")}>
                    {m.tipo === "saque" ? "Saque" : m.categoria ?? "Despesa"}
                  </span>
                  <span className="text-slate-600">{m.descricao}</span>
                  <span className={"ml-auto font-bold " + (m.tipo === "saque" ? "text-marca-green-dark" : "text-red-600")}>
                    {m.tipo === "saque" ? "+" : "−"}{formatBRL(Number(m.valor))}
                  </span>
                  {sessao.status !== "fechado" ? (
                    <BotaoConfirmar acao={removerMovimento} hidden={{ id: m.id }} mensagem="Remover este lançamento?" className="text-slate-400">🗑️</BotaoConfirmar>
                  ) : null}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
