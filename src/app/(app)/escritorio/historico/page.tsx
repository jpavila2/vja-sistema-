import { createClient } from "@/lib/supabase/server";
import { limitesMes, mesAtual, nomeMes } from "@/lib/datas";
import { formatBRL } from "@/lib/format";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Linha = {
  id: number; data_hora: string; total: number; status: string;
  forma_pagamento?: string; people?: { nome: string } | null;
};

export default async function HistoricoPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const { inicio, fim } = limitesMes(mes);
  const supabase = await createClient();

  const [{ data: vendasData }, { data: comprasData }] = await Promise.all([
    supabase.from("sales").select("id, data_hora, total, status, forma_pagamento, people(nome)")
      .gte("data_hora", inicio).lt("data_hora", fim).order("data_hora", { ascending: false }),
    supabase.from("purchases").select("id, data_hora, total, status, forma_pagamento, people(nome)")
      .gte("data_hora", inicio).lt("data_hora", fim).order("data_hora", { ascending: false }),
  ]);

  const vendas = (vendasData as unknown as Linha[]) ?? [];
  const compras = (comprasData as unknown as Linha[]) ?? [];
  const totalVendas = r2(vendas.filter((v) => v.status === "ativa").reduce((s, v) => s + Number(v.total), 0));
  const totalCompras = r2(compras.filter((c) => c.status !== "cancelada").reduce((s, c) => s + Number(c.total), 0));

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
          linhas={vendas} rotuloPessoa="Cliente" vazio="Nenhuma venda no mês." />
        <Tabela titulo="⚖️ Compras" total={totalCompras} cor="text-marca-gold"
          linhas={compras} rotuloPessoa="Catador" vazio="Nenhuma compra no mês." />
      </div>
    </div>
  );
}

function Tabela({ titulo, total, cor, linhas, rotuloPessoa, vazio }: {
  titulo: string; total: number; cor: string; linhas: Linha[]; rotuloPessoa: string; vazio: string;
}) {
  return (
    <div className="rounded-2xl border bg-white">
      <div className="flex items-center justify-between border-b bg-slate-50 p-3">
        <span className="font-bold text-marca-navy">{titulo} <span className="text-slate-400">({linhas.length})</span></span>
        <span className={"font-extrabold " + cor}>{formatBRL(total)}</span>
      </div>
      {linhas.length === 0 ? (
        <div className="p-6 text-center text-slate-400">{vazio}</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          {linhas.map((l) => (
            <div key={l.id} className={"flex items-center gap-3 border-b p-3 last:border-0 " + (l.status === "cancelada" ? "opacity-40" : "")}>
              <div className="w-14 shrink-0 text-xs font-bold text-slate-500">
                {new Date(l.data_hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{l.people?.nome ?? "—"}</div>
                <div className="text-xs text-slate-400">
                  {rotuloPessoa}{l.status === "cancelada" ? " · cancelada" : ""}
                </div>
              </div>
              <span className={"font-bold " + cor}>{formatBRL(Number(l.total))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
