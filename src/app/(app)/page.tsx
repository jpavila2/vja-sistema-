import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { resumoCaixa } from "@/lib/caixa";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";

export default async function PainelPage() {
  const { inicio, fim } = limitesDoDiaBR(hojeBR());
  const supabase = await createClient();
  const { data } = await supabase.from("purchases").select("total, status")
    .gte("data_hora", inicio).lt("data_hora", fim);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = resumoCaixa((data as any[]) ?? []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-marca-navy">Painel — hoje</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <CardResumo titulo="Comprado hoje" valor={formatBRL(r.totalComprado)} cor="teal" />
        <CardResumo titulo="Compras" valor={r.qtdCompras} cor="navy" />
        <CardResumo titulo="Ticket médio" valor={formatBRL(r.ticketMedio)} cor="gold" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/balanca" className="rounded-full bg-marca-teal px-5 py-3 font-bold text-white hover:bg-marca-teal-dark">Nova compra</Link>
        <Link href="/escritorio/conferencia" className="rounded-full border px-5 py-3 font-bold text-marca-navy hover:bg-slate-100">Conferência</Link>
        <Link href="/escritorio/caixa" className="rounded-full border px-5 py-3 font-bold text-marca-navy hover:bg-slate-100">Caixa do dia</Link>
      </div>
    </div>
  );
}
