import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { calcularSaldoCaixa } from "@/lib/caixa-fisico";
import { formatBRL } from "@/lib/format";
import { NavData } from "@/components/NavData";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import {
  BotaoAbrir, FormSaque, FormDespesa, FormFechar,
  SaldoInicialEditavel, LinhaMovimento, BotaoReabrir,
} from "./FormsCaixa";
import { ListaComprasCaixa } from "./ListaComprasCaixa";

export default async function CaixaPage({ searchParams }: { searchParams: { dia?: string } }) {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? "") ? searchParams.dia! : hojeBR();
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
    supabase.from("purchases").select("id, total, status, data_hora, people(nome), purchase_items(peso_bruto, peso_liquido, preco_unitario, subtotal, materials(nome, emoji, unidade))").eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim).order("data_hora", { ascending: false }),
    supabase.from("purchases").select("id, total, status, data_hora, people(nome), purchase_items(peso_bruto, peso_liquido, preco_unitario, subtotal, materials(nome, emoji, unidade))").eq("forma_pagamento", "pix").gte("data_hora", inicio).lt("data_hora", fim).order("data_hora", { ascending: false }),
    supabase.from("sales").select("total, status, people(nome)").eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
    supabase.from("sales").select("total, status, forma_pagamento, people(nome)").neq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const movimentos = (movs as any[]) ?? [];
  const ehDinheiro = (m: { forma_pagamento?: string }) => (m.forma_pagamento ?? "dinheiro") === "dinheiro";
  // só dinheiro mexe na gaveta; o resto fica fora do caixa físico
  const saques     = movimentos.filter((m) => m.tipo === "saque" && ehDinheiro(m));
  const despesas   = movimentos.filter((m) => m.tipo === "despesa" && ehDinheiro(m));
  const foraDoCaixa = movimentos.filter((m) => !ehDinheiro(m));
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
      <RealtimeRefresh tables={["cash_sessions", "cash_movements", "purchases", "sales"]} canal="caixa" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Caixa do dia</h1>
        <NavData dia={dia} base="/escritorio/caixa" />
      </div>

      {!sessao ? (
        <div className="rounded-2xl border bg-white p-6 text-center">
          <p className="mb-3 text-slate-500">O caixa de {new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR")} ainda não foi aberto.</p>
          <BotaoAbrir dia={dia} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-slate-200 sm:grid-cols-4">
            <Mini titulo="Saldo inicial" valor={sessao.status === "aberto"
              ? <SaldoInicialEditavel dia={dia} valor={Number(sessao.saldo_inicial)} />
              : formatBRL(sessao.saldo_inicial)} />
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
              <BotaoReabrir dia={dia} />
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border bg-white p-4">
              <FormSaque dia={dia} />
              <FormDespesa dia={dia} />
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
              : <ListaComprasCaixa compras={comprasDin} corValor="text-red-600" />}
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

          {/* lançamentos manuais em dinheiro (gaveta) */}
          <div className="rounded-2xl border bg-white">
            <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Lançamentos em dinheiro (gaveta)</div>
            {[...saques, ...despesas].length === 0 ? <div className="p-4 text-center text-slate-400">Nenhum saque/despesa em dinheiro.</div> :
              [...saques, ...despesas].map((m) => (
                <LinhaMovimento key={m.id} m={m} podeEditar={sessao.status !== "fechado"} />
              ))}
          </div>

          {/* movimentos fora do caixa (PIX/banco) — não mexem na gaveta */}
          {foraDoCaixa.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40">
              <div className="border-b border-amber-200 p-3 font-bold text-amber-800">
                Movimentos fora do caixa (PIX/banco) — não entram na conta da gaveta
              </div>
              {foraDoCaixa.map((m) => (
                <LinhaMovimento key={m.id} m={m} podeEditar={sessao.status !== "fechado"} />
              ))}
            </div>
          ) : null}

          {/* compras via PIX — clicáveis, não saíram da gaveta */}
          {comprasPix.length > 0 ? (
            <div className="rounded-2xl border bg-white">
              <div className="flex items-center justify-between border-b bg-slate-50 p-3">
                <span className="font-bold text-marca-navy">💳 Compras via PIX (não saíram da gaveta)</span>
                <span className="font-bold text-slate-600">{formatBRL(totalPixCompras)}</span>
              </div>
              <ListaComprasCaixa compras={comprasPix} corValor="text-slate-600" />
            </div>
          ) : null}

          {/* informativo vendas não-dinheiro */}
          {vendasOutras.length > 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-3 text-sm text-slate-500">
              📲 {vendasOutras.length} venda(s) via PIX/Transferência/Boleto/Cheque somando {formatBRL(totalVendasOutras)} — não entraram na gaveta.
            </div>
          ) : null}

          {/* fechar o caixa — sempre no fim da aba */}
          {sessao.status !== "fechado" ? (
            <div className="rounded-2xl border-2 border-marca-navy/20 bg-white p-4">
              <div className="mb-2 font-bold text-marca-navy">Fechar o caixa do dia</div>
              <FormFechar dia={dia} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Mini({ titulo, valor, cor = "text-marca-navy" }: { titulo: string; valor: React.ReactNode; cor?: string }) {
  return (
    <div className="bg-white px-3 py-2 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={"text-base font-extrabold sm:text-lg " + cor}>{valor}</div>
    </div>
  );
}
