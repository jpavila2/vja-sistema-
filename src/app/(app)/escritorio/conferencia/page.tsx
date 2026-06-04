import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { NavData } from "@/components/NavData";
import { ListaConferencia } from "./ListaConferencia";

export default async function ConferenciaPage({ searchParams }: { searchParams: { dia?: string } }) {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? "") ? searchParams.dia! : hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("id, total, status, forma_pagamento, data_hora, observacoes, people(nome), purchase_items(id, peso_liquido, preco_unitario, subtotal, materials(nome, emoji, unidade))")
    .gte("data_hora", inicio).lt("data_hora", fim)
    .order("data_hora", { ascending: false });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Conferência</h1>
        <NavData dia={dia} base="/escritorio/conferencia" />
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ListaConferencia compras={(data as any) ?? []} />
    </div>
  );
}
