import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buscarTudo } from "@/lib/supabase/paginar";
import { limitesMes, limitesMesData, mesAtual, nomeMes } from "@/lib/datas";
import { formatBRL } from "@/lib/format";
import { BotaoExportar } from "@/components/BotaoExportar";
import { ResumoMateriais } from "@/components/ResumoMateriais";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type ItemLinha = {
  peso?: number; peso_liquido?: number;
  materials?: { nome: string; emoji: string | null; unidade: string } | null;
};
type Linha = {
  id: number; data_hora: string; total: number; status: string;
  forma_pagamento?: string; people?: { nome: string } | null;
  itens?: ItemLinha[];
};
type Despesa = { id: number; dia: string; categoria: string | null; descricao: string | null; valor: number };

export default async function HistoricoPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const { inicio, fim } = limitesMes(mes);
  const { ini: diaIni, fim: diaFim } = limitesMesData(mes);
  const supabase = await createClient();

  // Paginado: sem isso o PostgREST corta em 1000 linhas e o total do mês sai menor.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [vendasData, comprasData, despesasData] = await Promise.all([
    buscarTudo<any>((de, ate) => supabase
      .from("sales").select("id, data_hora, total, status, forma_pagamento, people(nome), sale_items(peso, materials(nome, emoji, unidade))", { count: "exact" })
      .gte("data_hora", inicio).lt("data_hora", fim)
      .order("data_hora", { ascending: false }).order("id", { ascending: false }).range(de, ate)),
    buscarTudo<any>((de, ate) => supabase
      .from("purchases").select("id, data_hora, total, status, forma_pagamento, people(nome), purchase_items(peso_liquido, materials(nome, emoji, unidade))", { count: "exact" })
      .gte("data_hora", inicio).lt("data_hora", fim)
      .order("data_hora", { ascending: false }).order("id", { ascending: false }).range(de, ate)),
    buscarTudo<any>((de, ate) => supabase
      .from("cash_movements").select("id, dia, categoria, descricao, valor", { count: "exact" })
      .eq("tipo", "despesa").gte("dia", diaIni).lt("dia", diaFim)
      .order("dia", { ascending: false }).order("id", { ascending: false }).range(de, ate)),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendas: Linha[] = ((vendasData as any[]) ?? []).map((v) => ({ ...v, itens: v.sale_items ?? [] }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compras: Linha[] = ((comprasData as any[]) ?? []).map((c) => ({ ...c, itens: c.purchase_items ?? [] }));
  const despesas = (despesasData as unknown as Despesa[]) ?? [];
  const totalVendas = r2(vendas.filter((v) => v.status === "ativa").reduce((s, v) => s + Number(v.total), 0));
  const totalCompras = r2(compras.filter((c) => c.status !== "cancelada").reduce((s, c) => s + Number(c.total), 0));
  const totalDespesas = r2(despesas.reduce((s, d) => s + Number(d.valor), 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy capitalize">Histórico — {nomeMes(mes)}</h1>
        <form className="flex items-center gap-2">
          <input type="month" name="mes" defaultValue={mes} className="rounded-lg border p-1.5 text-sm" />
          <button className="rounded-lg bg-marca-teal px-3 py-1.5 text-sm font-bold text-white">Ver</button>
        </form>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Tabela titulo="📦 Vendas" total={totalVendas} cor="text-marca-teal-dark"
          linhas={vendas} rotuloPessoa="Cliente" vazio="Nenhuma venda no mês." hrefBase="/escritorio/venda"
          exportar={<BotaoExportar tipo="vendas" mes={mes} rotulo="Exportar mês" />} />
        <Tabela titulo="⚖️ Compras" total={totalCompras} cor="text-marca-gold"
          linhas={compras} rotuloPessoa="Catador" vazio="Nenhuma compra no mês." hrefBase="/escritorio/compra"
          exportar={<>
            <BotaoExportar tipo="compras" mes={mes} rotulo="Exportar mês" />
            <BotaoExportar tipo="compras" mes={mes} pagamento="pix" rotulo="Só PIX" />
          </>} />
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b bg-slate-50 p-3">
          <span className="font-bold text-marca-navy">💸 Despesas <span className="text-slate-400">({despesas.length})</span></span>
          <span className="font-extrabold text-red-600">{formatBRL(totalDespesas)}</span>
        </div>
        {despesas.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhuma despesa no mês.</div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto">
            {despesas.map((d) => (
              <Link key={d.id} href={`/escritorio/despesa/${d.id}`}
                className="flex items-center gap-3 border-b p-3 last:border-0 hover:bg-slate-50">
                <div className="w-14 shrink-0 text-xs font-bold text-slate-500">
                  {new Date(`${d.dia}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{d.categoria ?? "Sem categoria"}</div>
                  {d.descricao ? <div className="truncate text-xs text-slate-400">{d.descricao}</div> : null}
                </div>
                <span className="font-bold text-red-600">{formatBRL(Number(d.valor))}</span>
                <span className="text-slate-300">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tabela({ titulo, total, cor, linhas, rotuloPessoa, vazio, hrefBase, exportar }: {
  titulo: string; total: number; cor: string; linhas: Linha[]; rotuloPessoa: string; vazio: string; hrefBase: string;
  exportar?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 p-3">
        <span className="font-bold text-marca-navy">{titulo} <span className="text-slate-400">({linhas.length})</span></span>
        <div className="flex items-center gap-2">
          {exportar}
          <span className={"font-extrabold " + cor}>{formatBRL(total)}</span>
        </div>
      </div>
      {linhas.length === 0 ? (
        <div className="p-6 text-center text-slate-400">{vazio}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          {linhas.map((l) => (
            <Link key={l.id} href={`${hrefBase}/${l.id}`}
              className={"flex items-center gap-3 border-b p-3 last:border-0 hover:bg-slate-50 " + (l.status === "cancelada" ? "opacity-40" : "")}>
              <div className="w-14 shrink-0 text-xs font-bold text-slate-500">
                {new Date(l.data_hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{l.people?.nome ?? "—"}</div>
                <div className="text-xs text-slate-400">
                  {rotuloPessoa}{l.status === "cancelada" ? " · cancelada" : ""}
                </div>
                <ResumoMateriais itens={l.itens ?? []} />
              </div>
              <span className={"font-bold " + cor}>{formatBRL(Number(l.total))}</span>
              <span className="text-slate-300">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
