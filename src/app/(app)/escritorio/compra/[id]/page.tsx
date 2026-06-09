import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { cancelarCompraDet, excluirCompraDet } from "./actions";

const BADGE: Record<string, string> = {
  pendente: "bg-marca-gold-light text-marca-gold",
  conferida: "bg-marca-teal-light text-marca-teal-dark",
  cancelada: "bg-red-100 text-red-600",
};

type Item = {
  id: number; peso_bruto: number; peso_liquido: number; preco_unitario: number; subtotal: number;
  materials: { nome: string; emoji: string | null; unidade: string } | null;
};

export default async function CompraDetalhe({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("purchases")
    .select("id, total, status, forma_pagamento, data_hora, observacoes, motivo_cancelamento, people(nome), purchase_items(id, peso_bruto, peso_liquido, preco_unitario, subtotal, materials(nome, emoji, unidade))")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compra = c as any;
  const itens = (compra.purchase_items as Item[]) ?? [];
  const nome = compra.people?.nome ?? "—";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/escritorio/historico" className="text-sm font-bold text-marca-teal-dark hover:underline">← Voltar ao histórico</Link>

      <div className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black text-marca-navy">⚖️ Compra de {nome}</h1>
          <span className={"rounded-full px-2 py-0.5 text-xs font-bold " + (BADGE[compra.status] ?? "")}>{compra.status}</span>
          <span className="ml-auto text-2xl font-black text-marca-gold">{formatBRL(Number(compra.total))}</span>
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {new Date(compra.data_hora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          {compra.status !== "pendente" ? ` · ${compra.forma_pagamento === "pix" ? "PIX" : "Dinheiro"}` : ""}
        </div>
        {compra.observacoes ? <div className="mt-1 text-sm text-slate-500">Obs.: {compra.observacoes}</div> : null}
        {compra.status === "cancelada" && compra.motivo_cancelamento ? (
          <div className="mt-1 text-sm font-semibold text-red-600">Cancelamento: {compra.motivo_cancelamento}</div>
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
                {Number(it.peso_liquido).toLocaleString("pt-BR")} {it.materials?.unidade} × {formatBRL(Number(it.preco_unitario))}
                {Number(it.peso_liquido) !== Number(it.peso_bruto) ? ` (bruto ${Number(it.peso_bruto).toLocaleString("pt-BR")})` : ""}
              </div>
            </div>
            <span className="font-extrabold">{formatBRL(Number(it.subtotal))}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-4 text-xl font-black">
          <span className="text-slate-500">TOTAL</span><span className="text-marca-gold">{formatBRL(Number(compra.total))}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {compra.status !== "cancelada" ? (
          <BotaoConfirmar
            acao={cancelarCompraDet}
            hidden={{ id: compra.id }}
            mensagem={`Cancelar a compra de ${nome} (${formatBRL(Number(compra.total))})? O estoque será estornado, mas continua no histórico como cancelada.`}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            Cancelar compra
          </BotaoConfirmar>
        ) : null}
        <BotaoConfirmar
          acao={excluirCompraDet}
          hidden={{ id: compra.id }}
          mensagem={`EXCLUIR DE VEZ a compra de ${nome} (${formatBRL(Number(compra.total))})? Ela some do sistema${compra.status !== "cancelada" ? " e o estoque é estornado" : ""}. Não dá pra desfazer.`}
          className="rounded-full border border-red-500 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
        >
          🗑️ Excluir de vez
        </BotaoConfirmar>
      </div>
    </div>
  );
}
