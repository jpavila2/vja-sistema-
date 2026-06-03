import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { formatBRL } from "@/lib/format";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { cancelarVenda } from "./actions";
import { TelaVendas } from "./TelaVendas";
import type { Material, Pessoa, SaleWithPessoa } from "@/lib/types";

export default async function VendasPage() {
  const dia = hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();

  const [
    { data: matsData },
    { data: compradoresData },
    { data: vendasData },
    { data: profData },
  ] = await Promise.all([
    supabase.from("materials").select("*").eq("ativo", true).order("categoria").order("nome"),
    supabase.from("people").select("id, nome").in("tipo", ["cliente","ambos"]).eq("status","ativo").order("nome"),
    supabase
      .from("sales")
      .select("*, people(nome)")
      .gte("data_hora", inicio)
      .lt("data_hora", fim)
      .order("data_hora", { ascending: false }),
    supabase.from("profiles").select("papel").single(),
  ]);

  const materiais = (matsData as Material[]) ?? [];
  const compradores = (compradoresData as Pick<Pessoa,"id"|"nome">[]) ?? [];
  const vendas = (vendasData as SaleWithPessoa[]) ?? [];
  const isAdmin = profData?.papel === "admin";

  const totalDia = vendas
    .filter((v) => v.status === "ativa")
    .reduce((s, v) => s + v.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Vendas</h1>
        <span className="text-sm text-slate-500">
          {new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      {/* ── vendas do dia ── */}
      {vendas.length > 0 ? (
        <div className="rounded-2xl border bg-white">
          <div className="flex items-center justify-between border-b bg-slate-50 p-3">
            <span className="font-bold text-marca-navy">Vendas de hoje</span>
            <span className="font-extrabold text-marca-teal-dark">{formatBRL(totalDia)}</span>
          </div>
          {vendas.map((v) => (
            <div key={v.id}
              className={"flex flex-wrap items-center gap-3 border-b p-3 last:border-0 " +
                (v.status === "cancelada" ? "opacity-50" : "")}>
              <div className="flex-1">
                <div className="font-bold">
                  {v.people?.nome ?? "—"}
                  {v.status === "cancelada" && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Cancelada</span>
                  )}
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(v.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {v.forma_pagamento === "dinheiro" ? "💵 Dinheiro" :
                   v.forma_pagamento === "pix" ? "📲 PIX" :
                   v.forma_pagamento === "transferencia" ? "🏦 Transferência" :
                   v.forma_pagamento === "boleto" ? "📄 Boleto" : "📑 Cheque"}
                </div>
              </div>
              <span className="font-extrabold text-marca-teal-dark">{formatBRL(v.total)}</span>
              {v.status === "ativa" && isAdmin ? (
                <BotaoConfirmar
                  acao={cancelarVenda}
                  hidden={{ id: v.id }}
                  mensagem={`Cancelar venda de ${formatBRL(v.total)} para ${v.people?.nome}? O estoque será estornado.`}
                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                  Cancelar
                </BotaoConfirmar>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-5 text-center text-slate-400">
          Nenhuma venda registrada hoje.
        </div>
      )}

      {/* ── nova venda ── */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-4 text-lg font-extrabold text-marca-navy">Nova venda</div>
        <TelaVendas materiais={materiais} compradores={compradores} />
      </div>
    </div>
  );
}
