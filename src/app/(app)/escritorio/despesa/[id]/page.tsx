import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { excluirDespesaDet } from "./actions";

export default async function DespesaDetalhe({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("cash_movements")
    .select("id, dia, tipo, categoria, descricao, valor, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!d || d.tipo !== "despesa") notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/escritorio/historico" className="text-sm font-bold text-marca-teal-dark hover:underline">← Voltar ao histórico</Link>

      <div className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black text-marca-navy">💸 {d.categoria ?? "Despesa"}</h1>
          <span className="ml-auto text-2xl font-black text-red-600">−{formatBRL(Number(d.valor))}</span>
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {new Date(`${d.dia}T12:00:00`).toLocaleDateString("pt-BR")}
        </div>
        {d.descricao ? <div className="mt-2 text-base text-slate-700">{d.descricao}</div> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <BotaoConfirmar
          acao={excluirDespesaDet}
          hidden={{ id: d.id }}
          mensagem={`Excluir esta despesa de ${formatBRL(Number(d.valor))}? Não dá pra desfazer.`}
          className="rounded-full border border-red-500 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
        >
          🗑️ Excluir despesa
        </BotaoConfirmar>
      </div>
    </div>
  );
}
