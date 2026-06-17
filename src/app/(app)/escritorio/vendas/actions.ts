"use server";

import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/supabase/guard";

export async function registrarVenda(payload: {
  pessoa_id: number;
  observacoes: string;
  forma_pagamento: string;
  itens: { material_id: number; peso: number; preco_unitario: number }[];
  client_request_id: string;
  recebido?: boolean;
}): Promise<{ ok: true; id: number } | { ok: false; erro: string }> {
  try {
    const { supabase } = await exigirPapel(["admin", "escritorio"]);
    const { data, error } = await supabase.rpc("registrar_venda", {
      p_pessoa_id: payload.pessoa_id,
      p_observacoes: payload.observacoes,
      p_forma_pagamento: payload.forma_pagamento,
      p_itens: payload.itens,
      p_client_request_id: payload.client_request_id,
    });
    if (error) return { ok: false, erro: error.message };
    // venda a prazo: marca como ainda não recebida
    if (payload.recebido === false && data) {
      await supabase.from("sales").update({ recebido: false }).eq("id", data as number);
    }
    revalidatePath("/escritorio/vendas");
    revalidatePath("/escritorio/caixa");
    revalidatePath("/escritorio/areceber");
    revalidatePath("/");
    return { ok: true, id: data as number };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao registrar venda." };
  }
}

export async function marcarRecebido(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!id) throw new Error("Venda inválida.");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.from("sales")
    .update({ recebido: true, recebido_em: new Date().toISOString() })
    .eq("id", id).eq("status", "ativa");
  if (error) throw new Error("Não foi possível baixar: " + error.message);
  revalidatePath("/escritorio/areceber");
  revalidatePath("/escritorio/vendas");
  revalidatePath("/");
}

export async function trocarClienteVenda(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const pessoa_id = Number(formData.get("pessoa_id"));
  if (!id || !pessoa_id) throw new Error("Selecione um cliente.");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.from("sales").update({ pessoa_id }).eq("id", id);
  if (error) throw new Error("Não foi possível trocar o cliente: " + error.message);
  revalidatePath("/escritorio/vendas");
  revalidatePath("/escritorio/relatorio");
  revalidatePath("/");
}

export async function alterarDataVenda(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const data = String(formData.get("data") ?? ""); // yyyy-mm-dd
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("Data inválida.");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  // preserva o horário original (fuso de São Paulo, UTC-3 fixo)
  const { data: row, error: e1 } = await supabase
    .from("sales").select("data_hora").eq("id", id).single();
  if (e1 || !row) throw new Error("Venda não encontrada.");
  const hora = new Date(row.data_hora).toLocaleTimeString("en-GB", {
    timeZone: "America/Sao_Paulo", hour12: false,
  }); // HH:mm:ss
  const novaISO = `${data}T${hora}-03:00`;
  const { error } = await supabase.from("sales").update({ data_hora: novaISO }).eq("id", id);
  if (error) throw new Error("Não foi possível mudar a data: " + error.message);
  revalidatePath("/escritorio/vendas");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/relatorio");
  revalidatePath("/escritorio/areceber");
  revalidatePath("/");
}

export async function editarVenda(input: {
  id: number;
  forma_pagamento: string;
  itens: { material_id: number; peso: number; preco_unitario: number }[];
}): Promise<void> {
  if (!input.itens || input.itens.length === 0) {
    throw new Error("A venda precisa de ao menos um item.");
  }
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("editar_venda", {
    p_id: input.id,
    p_forma_pagamento: input.forma_pagamento,
    p_itens: input.itens.map((i) => ({
      material_id: i.material_id, peso: i.peso, preco_unitario: i.preco_unitario,
    })),
  });
  if (error) throw new Error("Não foi possível salvar a edição: " + error.message);
  revalidatePath("/escritorio/vendas");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/relatorio");
  revalidatePath("/escritorio/materiais");
  revalidatePath("/");
}

export async function cancelarVenda(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("cancelar_venda", {
    p_venda_id: id,
    p_motivo: motivo || null,
  });
  if (error) throw new Error("Não foi possível cancelar: " + error.message);
  revalidatePath("/escritorio/vendas");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/");
}
