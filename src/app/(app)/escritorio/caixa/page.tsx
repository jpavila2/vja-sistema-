import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { calcularSaldoCaixa } from "@/lib/caixa-fisico";
import { formatBRL } from "@/lib/format";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoAbrir, FormSaque, FormDespesa, FormFechar } from "./FormsCaixa";
import { removerMovimento } from "./actions";

export default async function CaixaPage({ searchParams }: { searchParams: { dia?: string } }) {
  const dia = searchParams.dia ?? hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();

  const [
    { data: sessao },
    { data: movs },
    { data: comprasData },
    { data: comprasPixData },
    { data: vendasDinData },
    { data: vendasOutrasData },
  ] = await Promise.all([
    supabase.from("cash_sessions").select("*").eq("dia", dia).maybeSingle(),
    supabase.from("cash_movements").select("*").eq("dia", dia).order("created_at"),
    supabase.from("purchases").select("total, status").eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
    supabase.from("purchases").select("total, status").eq("forma_pagamento", "pix").gte("data_hora", inicio).lt("data_hora", fim),
    supabase.from("sales").select("total, status, people(nome)").eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
    supabase.from("sales").select("total, status, forma_pagamento, people(nome)").neq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const movimentos = (movs as any[]) ?? [];
  const saques    = movimentos.filter((m) => m.tipo === "saque");
  const despesas  = movimentos.filter((m) => m.tipo === "despesa");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comprasDin  = ((comprasData  as any[]) ?? []).filter((c) => c.status !== "cancelada");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comprasPix  = ((comprasPixData as any[]) ?? []).filter((c) => c.status !== "cancelada");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendasDin   = ((vendasDinData  as any[]) ?? []).filter((v) => v.status !== "cancelada");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendasOutras = ((vendasOutrasData as any[]) ?? []).filter((v) => v.status !== "cancelada");

  const totalPixCompras  = Math.round(comprasPix.reduce((s: number, c: {total:number}) => s + Number(c.total), 0) * 100) / 100;
  const totalVendasOutras = Math.round(vendasOutras.reduce((s: number, v: {total:number}) => s + Number(v.total), 0) * 100) / 100;

  const r = calcularSaldoCaixa({
    saldoInicial: sessao?.saldo_inicial ?? 0,
    saques:          saques.map((m) => Number(m.valor)),
    comprasDinheiro: comprasDin.map((c: {total:number}) => Number(c.total)),
    despesas:        despesas.map((m) => Number(m.valor)),
    vendasDinheiro:  vendasDin.map((v: {total:number}) => Number(v.total)),
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
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-slate-200 sm:grid-cols-4">
            <Mini titulo="Saldo inicial" valor={formatBRL(sessao.saldo_inicial)} />
            <Mini titulo="Entradas" valor={formatBRL(r.totalSaques + r.totalVendas)} cor="text-marca-green-dark" />
            <Mini titulo="Saídas" valor={formatBRL(r.totalCompras + r.totalDespesas)} cor="text-marca-gold" />
            <Mini titulo="Saldo calculado" valor={formatBRL(r.saldoCalculado)} cor="text-marca-teal-dark" />
          </div>

          {sessao.status === "fechado" ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-bold text-marca-navy">Caixa fechado</div>
              <div className="text-sm">
                Contado: <b>{formatBRL(sessao.saldo_contado)}</b>
                {" · "}Calculado: <b>{formatBRL(sessao.saldo_calculado ?? r.saldoCalculado)}</b>
                {" · "}Diferença:{" "}
                <b className={(sessao.diferenca ?? r.diferenca ?? 0) === 0
                  ? "text-marca-green-dark"
                  : Math.abs(sessao.diferenca ?? r.diferenca ?? 0) > 100
                    ? "text-red-600" : "text-amber-600"}>
                  {formatBRL(sessao.diferenca ?? r.diferenca ?? 0)}{" "}
                  {(sessao.diferenca ?? 0) > 0 ? "(sobra)" : (sessao.diferenca ?? 0) < 0 ? "(falta)" : ""}
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

          {/* compras em dinheiro */}
          <div className="rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b bg-slate-50 p-3">
              <span className="font-bold text-marca-navy">Compras em dinheiro (saiu da gaveta)</span>
              <span className="font-bold text-red-600">−{formatBRL(r.totalCompras)}</span>
            </div>
            {comprasDin.length === 0
              ? <div className="p-4 text-center text-slate-400">Nenhuma.</div>
              : <div className="p-3 text-sm text-slate-600">{comprasDin.length} compra(s) — saíram da gaveta</div>}
          </div>

          {/* vendas em dinheiro */}
          {vendasDin.length > 0 ? (
            <div className="rounded-2xl border bg-white">
              <div className="flex items-center justify-between border-b bg-marca-green-dark/10 p-3">
                <span className="font-bold text-marca-green-dark">Vendas em dinheiro (entrou na gaveta)</span>
                <span className="font-bold text-marca-green-dark">+{formatBRL(r.totalVendas)}</span>
              </div>
              {vendasDin.map((v: {total:number; people?: {nome:string}}, i: number) => (
                <div key={i} className="flex items-center gap-2 border-b p-3 last:border-0 text-sm">
                  <span className="text-slate-600">{v.people?.nome ?? "—"}</span>
                  <span className="ml-auto font-bold text-marca-green-dark">{formatBRL(Number(v.total))}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* lançamentos manuais */}
          <div className="rounded-2xl border bg-white">
            <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Lançamentos do dia</div>
            {movimentos.length === 0 ? <div className="p-4 text-center text-slate-400">Nenhum saque/despesa.</div> :
              movimentos.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border-b p-3 last:border-0">
                  <span className={"rounded-full px-2 py-0.5 text-xs font-bold " +
                    (m.tipo === "saque" ? "bg-marca-green-dark/10 text-marca-green-dark" : "bg-marca-gold-light text-marca-gold")}>
                    {m.tipo === "saque" ? "Saque" : m.categoria ?? "Despesa"}
                  </span>
                  <span className="text-slate-600">{m.descricao}</span>
                  <span className={"ml-auto font-bold " + (m.tipo === "saque" ? "text-marca-green-dark" : "text-red-600")}>
                    {m.tipo === "saque" ? "+" : "−"}{formatBRL(Number(m.valor))}
                  </span>
                  {sessao.status !== "fechado" ? (
                    <BotaoConfirmar acao={removerMovimento} hidden={{ id: m.id }}
                      mensagem="Remover este lançamento?" className="text-slate-400">🗑️</BotaoConfirmar>
                  ) : null}
                </div>
              ))}
          </div>

          {/* informativo PIX compras */}
          {comprasPix.length > 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-3 text-sm text-slate-500">
              💳 {comprasPix.length} compra(s) via <b>PIX</b> somando {formatBRL(totalPixCompras)} — não saíram da gaveta.
            </div>
          ) : null}

          {/* informativo vendas não-dinheiro */}
          {vendasOutras.length > 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-3 text-sm text-slate-500">
              📲 {vendasOutras.length} venda(s) via PIX/Transferência/Boleto/Cheque somando {formatBRL(totalVendasOutras)} — não entraram na gaveta.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Mini({ titulo, valor, cor = "text-marca-navy" }: { titulo: string; valor: string; cor?: string }) {
  return (
    <div className="bg-white px-3 py-2 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={"text-base font-extrabold sm:text-lg " + cor}>{valor}</div>
    </div>
  );
}
