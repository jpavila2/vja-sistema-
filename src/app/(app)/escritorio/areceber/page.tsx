import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { marcarRecebido } from "../vendas/actions";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Venda = {
  id: number; data_hora: string; total: number; forma_pagamento: string;
  observacoes: string | null; people?: { nome: string } | null;
};

const FORMA: Record<string, string> = {
  dinheiro: "💵 Dinheiro", pix: "📲 PIX", transferencia: "🏦 Transferência",
  boleto: "📄 Boleto", cheque: "📑 Cheque",
};

export default async function AReceberPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select("id, data_hora, total, forma_pagamento, observacoes, people(nome)")
    .eq("status", "ativa").eq("recebido", false)
    .order("data_hora", { ascending: true });

  const vendas = (data as unknown as Venda[]) ?? [];
  const total = r2(vendas.reduce((s, v) => s + Number(v.total), 0));

  // agrupa por cliente para visão de quem deve
  const porCliente = new Map<string, number>();
  for (const v of vendas) {
    const nome = v.people?.nome ?? "—";
    porCliente.set(nome, r2((porCliente.get(nome) ?? 0) + Number(v.total)));
  }
  const clientes = Array.from(porCliente.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Contas a receber</h1>
        <div className="rounded-xl bg-amber-50 px-4 py-2 text-right">
          <div className="text-xs font-semibold uppercase text-amber-700">Total a receber</div>
          <div className="text-2xl font-black text-amber-800">{formatBRL(total)}</div>
        </div>
      </div>

      {vendas.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-400">
          🎉 Nada a receber. Tudo em dia.
        </div>
      ) : (
        <>
          {clientes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {clientes.map(([nome, v]) => (
                <span key={nome} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-marca-navy">
                  {nome}: <b className="text-amber-800">{formatBRL(v)}</b>
                </span>
              ))}
            </div>
          )}

          <div className="rounded-2xl border bg-white">
            {vendas.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-3 border-b p-3 last:border-0">
                <div className="w-16 shrink-0 text-xs font-bold text-slate-500">
                  {new Date(v.data_hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{v.people?.nome ?? "—"}</div>
                  <div className="text-xs text-slate-400">
                    {FORMA[v.forma_pagamento] ?? v.forma_pagamento}{v.observacoes ? ` · ${v.observacoes}` : ""}
                  </div>
                </div>
                <span className="font-extrabold text-amber-800">{formatBRL(Number(v.total))}</span>
                <form action={marcarRecebido}>
                  <input type="hidden" name="id" value={v.id} />
                  <button className="rounded-lg bg-marca-green px-3 py-2 text-xs font-bold text-white hover:bg-marca-green-dark">
                    ✓ Recebido
                  </button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
