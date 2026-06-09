import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { cancelarVendaDet } from "./actions";

const BADGE: Record<string, string> = {
  ativa: "bg-marca-teal-light text-marca-teal-dark",
  cancelada: "bg-red-100 text-red-600",
};
const FORMA: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX", transferencia: "Transferência", boleto: "Boleto", cheque: "Cheque",
};

type Item = {
  id: number; peso: number; preco_unitario: number; subtotal: number;
  materials: { nome: string; emoji: string | null; unidade: string } | null;
};

export default async function VendaDetalhe({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("sales")
    .select("id, total, status, forma_pagamento, recebido, data_hora, observacoes, motivo_cancelamento, people(nome), sale_items(id, peso, preco_unitario, subtotal, materials(nome, emoji, unidade))")
    .eq("id", id)
    .maybeSingle();
  if (!v) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const venda = v as any;
  const itens = (venda.sale_items as Item[]) ?? [];
  const nome = venda.people?.nome ?? "—";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/escritorio/historico" className="text-sm font-bold text-marca-teal-dark hover:underline">← Voltar ao histórico</Link>

      <div className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black text-marca-navy">📦 Venda para {nome}</h1>
          <span className={"rounded-full px-2 py-0.5 text-xs font-bold " + (BADGE[venda.status] ?? "")}>{venda.status}</span>
          <span className="ml-auto text-2xl font-black text-marca-teal-dark">{formatBRL(Number(venda.total))}</span>
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {new Date(venda.data_hora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          {" · "}{FORMA[venda.forma_pagamento] ?? venda.forma_pagamento}
          {venda.recebido === false ? " · a receber" : ""}
        </div>
        {venda.observacoes ? <div className="mt-1 text-sm text-slate-500">Obs.: {venda.observacoes}</div> : null}
        {venda.status === "cancelada" && venda.motivo_cancelamento ? (
          <div className="mt-1 text-sm font-semibold text-red-600">Cancelamento: {venda.motivo_cancelamento}</div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Itens ({itens.length})</div>
        {itens.map((it) => (
          <div key={it.id} className="flex items-center gap-3 border-b p-3 last:border-0">
            <span className="text-2xl">{it.materials?.emoji}</span>
            <div className="flex-1">
              <div className="font-bold">{it.materials?.nome}</div>
              <div className="text-sm text-slate-500">
                {Number(it.peso).toLocaleString("pt-BR")} {it.materials?.unidade} × {formatBRL(Number(it.preco_unitario))}
              </div>
            </div>
            <span className="font-extrabold">{formatBRL(Number(it.subtotal))}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-4 text-xl font-black">
          <span className="text-slate-500">TOTAL</span><span className="text-marca-teal-dark">{formatBRL(Number(venda.total))}</span>
        </div>
      </div>

      {venda.status === "ativa" ? (
        <div className="flex flex-wrap gap-2">
          <BotaoConfirmar
            acao={cancelarVendaDet}
            hidden={{ id: venda.id }}
            mensagem={`Cancelar a venda para ${nome} (${formatBRL(Number(venda.total))})? O estoque será estornado.`}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            Cancelar venda
          </BotaoConfirmar>
        </div>
      ) : null}
    </div>
  );
}
