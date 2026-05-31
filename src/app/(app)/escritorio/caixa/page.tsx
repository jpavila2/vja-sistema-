import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { resumoCaixa } from "@/lib/caixa";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";

export default async function CaixaPage({ searchParams }: { searchParams: { dia?: string } }) {
  const dia = searchParams.dia ?? hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("id, total, status, data_hora, people(nome)")
    .gte("data_hora", inicio).lt("data_hora", fim)
    .order("data_hora", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compras = (data as any[]) ?? [];
  const r = resumoCaixa(compras.map((c) => ({ total: c.total, status: c.status })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Caixa do dia</h1>
        <form><input type="date" name="dia" defaultValue={dia} className="rounded-xl border p-2" /></form>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CardResumo titulo="Total comprado" valor={formatBRL(r.totalComprado)} cor="teal" />
        <CardResumo titulo="Compras" valor={r.qtdCompras} cor="navy" />
        <CardResumo titulo="Ticket médio" valor={formatBRL(r.ticketMedio)} cor="gold" />
      </div>
      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Compras de {new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR")}</div>
        {compras.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhuma compra.</div>
        ) : compras.map((c) => (
          <div key={c.id} className={"flex items-center gap-3 border-b p-3 last:border-0 " + (c.status === "cancelada" ? "opacity-50 line-through" : "")}>
            <span className="font-semibold text-marca-navy">{c.people?.nome ?? "—"}</span>
            <span className="ml-auto font-bold">{formatBRL(c.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
