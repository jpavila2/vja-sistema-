import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { NavData } from "@/components/NavData";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { ListaConferencia } from "./ListaConferencia";

export default async function ConferenciaPage({ searchParams }: { searchParams: { dia?: string } }) {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? "") ? searchParams.dia! : hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();
  const [{ data }, { data: materiais }, { data: fornecedoresData }] = await Promise.all([
    supabase
      .from("purchases")
      .select("id, total, status, forma_pagamento, data_hora, observacoes, people(nome), purchase_items(id, material_id, peso_bruto, peso_liquido, preco_unitario, subtotal, materials(nome, emoji, unidade))")
      .gte("data_hora", inicio).lt("data_hora", fim)
      .order("data_hora", { ascending: false }),
    supabase.from("materials").select("id, nome, emoji, unidade, preco_compra").eq("ativo", true).order("nome"),
    supabase.from("people").select("id, nome").in("tipo", ["fornecedor", "ambos"]).eq("status", "ativo").order("nome"),
  ]);
  return (
    <div className="space-y-4">
      <RealtimeRefresh tables={["purchases", "purchase_items", "stock_movements"]} canal="conferencia" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Conferência</h1>
        <NavData dia={dia} base="/escritorio/conferencia" />
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ListaConferencia compras={(data as any) ?? []} materiais={(materiais as any) ?? []} fornecedores={(fornecedoresData as any) ?? []} />
    </div>
  );
}
