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
  const di = `${ano}-01-01`, df = `${ano + 1}-01-01`;
  const supabase = await createClient();

  const [
    { data: vendasData }, { data: itensData }, { data: comprasData },
    { data: despesasData }, { data: materiaisData },
  ] = await Promise.all([
    supabase.from("sales").select("total, status, people(nome)")
      .eq("status", "ativa").gte("data_hora", inicio).lt("data_hora", fim),
    supabase.from("sale_items").select("subtotal, materials(nome), sales!inner(status, data_hora)")
      .eq("sales.status", "ativa").gte("sales.data_hora", inicio).lt("sales.data_hora", fim),
    supabase.from("purchases").select("total, status, people(nome)")
      .neq("status", "cancelada").gte("data_hora", inicio).lt("data_hora", fim),
    supabase.from("cash_movements").select("valor").eq("tipo", "despesa").gte("dia", di).lt("dia", df),
    supabase.from("materials").select("nome, preco_compra, preco_venda, estoque_atual, mostrar_venda")
      .eq("ativo", true),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const vendas = (vendasData as any[]) ?? [];
  const itens = (itensData as any[]) ?? [];
  const compras = (comprasData as any[]) ?? [];
  const despesasArr = (despesasData as any[]) ?? [];
  const materiais = (materiaisData as any[]) ?? [];
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const receita = r2(vendas.reduce((s, v) => s + Number(v.total), 0));
  const comprado = r2(compras.reduce((s, c) => s + Number(c.total), 0));
  const despesas = r2(despesasArr.reduce((s, d) => s + Number(d.valor), 0));
  const lucro = r2(receita - comprado - despesas);
  const nVendas = vendas.length;

  const porCliente = agrupar(vendas.map((v) => ({ rotulo: v.people?.nome ?? "Sem cliente", valor: Number(v.total) })));
  const porMaterial = agrupar(itens.map((i) => ({ rotulo: i.materials?.nome ?? "Sem material", valor: Number(i.subtotal) })));
  const porCatador = agrupar(compras.map((c) => ({ rotulo: c.people?.nome ?? "Sem catador", valor: Number(c.total) })));

  // margem por material (preços atuais, não depende do período)
  const margens = materiais
    .filter((m) => Number(m.preco_venda) > 0)
    .map((m) => {
      const compra = Number(m.preco_compra), venda = Number(m.preco_venda);
      const margem = r2(venda - compra);
      const pct = compra > 0 ? Math.round((margem / compra) * 100) : null;
      const estoque = Number(m.estoque_atual);
      return { nome: m.nome, compra, venda, margem, pct, estoque, potencial: r2(estoque * margem) };
    })
    .sort((a, b) => b.margem - a.margem);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Relatório do ano</h1>
        <div className="flex items-center gap-2">
          <Link href={`/escritorio/relatorio?ano=${ano - 1}`} className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-600">← {ano - 1}</Link>
          <span className="rounded-lg bg-marca-teal px-3 py-1.5 text-sm font-bold text-white">{ano}</span>
          <Link href={`/escritorio/relatorio?ano=${ano + 1}`} className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-600">{ano + 1} →</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardResumo titulo="Receita (vendas)" valor={formatBRL(receita)} cor="green" />
        <CardResumo titulo="Comprado" valor={formatBRL(comprado)} cor="gold" />
        <CardResumo titulo="Despesas" valor={formatBRL(despesas)} cor="navy" />
        <CardResumo titulo="Lucro líquido" valor={formatBRL(Math.abs(lucro))} cor={lucro >= 0 ? "green" : "gold"}
          sufixo={lucro >= 0 ? "▲" : "▼ no vermelho"} />
      </div>
      <p className="-mt-3 text-xs text-slate-500">
        Lucro líquido = Receita − Comprado − Despesas · {nVendas} venda(s) no ano.
      </p>

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

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-1 font-bold text-marca-navy">Catadores que mais trouxeram</div>
        <p className="mb-4 text-xs text-slate-500">Valor comprado de cada catador no ano.</p>
        <BarrasHorizontais itens={porCatador.slice(0, 18)} cor="bg-marca-navy" vazio="Sem compras registradas no ano." />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-1 font-bold text-marca-navy">Margem por material</div>
        <p className="mb-4 text-xs text-slate-500">
          Quanto se ganha por kg (venda − compra). Lucro no estoque = margem × estoque atual.
        </p>
        {margens.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">Defina preços de venda nos materiais.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-2 font-semibold text-slate-600">Material</th>
                  <th className="p-2 text-right font-semibold text-slate-600">Compra</th>
                  <th className="p-2 text-right font-semibold text-slate-600">Venda</th>
                  <th className="p-2 text-right font-semibold text-slate-600">Margem</th>
                  <th className="p-2 text-right font-semibold text-slate-600">%</th>
                  <th className="p-2 text-right font-semibold text-slate-600">Estoque</th>
                  <th className="p-2 text-right font-semibold text-slate-600">Lucro no estoque</th>
                </tr>
              </thead>
              <tbody>
                {margens.map((m) => (
                  <tr key={m.nome} className="border-t">
                    <td className="p-2 font-medium">{m.nome}</td>
                    <td className="p-2 text-right">{formatBRL(m.compra)}</td>
                    <td className="p-2 text-right">{formatBRL(m.venda)}</td>
                    <td className={"p-2 text-right font-bold " + (m.margem >= 0 ? "text-marca-green-dark" : "text-red-600")}>{formatBRL(m.margem)}</td>
                    <td className="p-2 text-right text-slate-500">{m.pct === null ? "—" : `${m.pct}%`}</td>
                    <td className="p-2 text-right text-slate-500">{m.estoque.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                    <td className="p-2 text-right font-semibold">{formatBRL(m.potencial)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function agrupar(linhas: ItemBarra[]): ItemBarra[] {
  const m = new Map<string, number>();
  for (const l of linhas) m.set(l.rotulo, r2((m.get(l.rotulo) ?? 0) + l.valor));
  return Array.from(m.entries()).map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
}
