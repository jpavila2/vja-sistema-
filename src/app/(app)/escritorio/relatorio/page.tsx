import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { anoAtual, limitesAno } from "@/lib/datas";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";
import { BarrasHorizontais, type ItemBarra } from "@/components/BarrasHorizontais";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default async function RelatorioAnoPage({ searchParams }: { searchParams: { ano?: string } }) {
  const ano = /^\d{4}$/.test(searchParams.ano ?? "") ? Number(searchParams.ano) : anoAtual();
  const { inicio, fim } = limitesAno(ano);
  const supabase = await createClient();

  const [{ data: vendasData }, { data: itensData }] = await Promise.all([
    // vendas do ano (pra total + por cliente)
    supabase.from("sales").select("total, status, people(nome)")
      .eq("status", "ativa").gte("data_hora", inicio).lt("data_hora", fim),
    // itens (pra por material) — filtra pela venda via inner join
    supabase.from("sale_items").select("subtotal, materials(nome), sales!inner(status, data_hora)")
      .eq("sales.status", "ativa").gte("sales.data_hora", inicio).lt("sales.data_hora", fim),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendas = (vendasData as any[]) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itens = (itensData as any[]) ?? [];

  const receita = r2(vendas.reduce((s, v) => s + Number(v.total), 0));
  const nVendas = vendas.length;
  const ticket = nVendas ? r2(receita / nVendas) : 0;

  // por cliente
  const porCliente = agrupar(vendas.map((v) => ({
    rotulo: v.people?.nome ?? "Sem cliente", valor: Number(v.total),
  })));

  // por material
  const porMaterial = agrupar(itens.map((i) => ({
    rotulo: i.materials?.nome ?? "Sem material", valor: Number(i.subtotal),
  })));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Relatório do ano</h1>
        <div className="flex items-center gap-2">
          <Link href={`/escritorio/relatorio?ano=${ano - 1}`}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-600">← {ano - 1}</Link>
          <span className="rounded-lg bg-marca-teal px-3 py-1.5 text-sm font-bold text-white">{ano}</span>
          <Link href={`/escritorio/relatorio?ano=${ano + 1}`}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-600">{ano + 1} →</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CardResumo titulo={`Receita ${ano}`} valor={formatBRL(receita)} cor="green" />
        <CardResumo titulo="Vendas no ano" valor={nVendas} cor="navy" />
        <CardResumo titulo="Ticket médio" valor={formatBRL(ticket)} cor="gold" />
      </div>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-1 font-bold text-marca-navy">Receita por material</div>
        <p className="mb-4 text-xs text-slate-500">Quanto cada material rendeu em vendas no ano.</p>
        <BarrasHorizontais itens={porMaterial.slice(0, 18)} cor="bg-marca-teal" vazio="Sem vendas no ano." />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-1 font-bold text-marca-navy">De quais clientes veio o dinheiro</div>
        <p className="mb-4 text-xs text-slate-500">Receita por comprador no ano.</p>
        <BarrasHorizontais itens={porCliente} cor="bg-marca-gold" vazio="Sem vendas no ano." />
      </section>
    </div>
  );
}

function agrupar(linhas: ItemBarra[]): ItemBarra[] {
  const m = new Map<string, number>();
  for (const l of linhas) m.set(l.rotulo, r2((m.get(l.rotulo) ?? 0) + l.valor));
  return Array.from(m.entries()).map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
}
