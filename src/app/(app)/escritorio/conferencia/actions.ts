"use server";

import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/supabase/guard";

export async function conferirCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const formaRaw = String(formData.get("forma_pagamento") ?? "dinheiro");
  const forma_pagamento = formaRaw === "pix" ? "pix" : "dinheiro";
  const { supabase, user } = await exigirPapel(["admin", "escritorio"]);
  // só confere o que está PENDENTE (evita re-conferir cancelada/já conferida)
  const { data, error } = await supabase.from("purchases")
    .update({ status: "conferida", forma_pagamento, conferida_por: user.id, conferida_em: new Date().toISOString() })
    .eq("id", id).eq("status", "pendente").select("id");
  if (error) throw new Error("Não foi possível conferir: " + error.message);
  if (!data || data.length === 0) throw new Error("Compra não está pendente (já conferida ou cancelada).");
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/caixa");
}

type ItemEdicao = { material_id: number; peso_liquido: number; preco_unitario: number };

export async function editarCompra(input: {
  id: number;
  forma_pagamento: string;
  itens: ItemEdicao[];
}) {
  if (!input.itens || input.itens.length === 0) {
    throw new Error("A compra precisa de ao menos um item.");
  }
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("editar_compra", {
    p_id: input.id,
    p_forma_pagamento: input.forma_pagamento === "pix" ? "pix" : "dinheiro",
    p_itens: input.itens.map((i) => ({
      material_id: i.material_id,
      peso_liquido: i.peso_liquido,
      preco_unitario: i.preco_unitario,
    })),
  });
  if (error) throw new Error("Não foi possível salvar a edição: " + error.message);
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/materiais");
}

export async function alterarDataCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const data = String(formData.get("data") ?? ""); // yyyy-mm-dd
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("Data inválida.");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  // preserva o horário original (fuso de São Paulo, UTC-3 fixo)
  const { data: row, error: e1 } = await supabase
    .from("purchases").select("data_hora").eq("id", id).single();
  if (e1 || !row) throw new Error("Compra não encontrada.");
  const hora = new Date(row.data_hora).toLocaleTimeString("en-GB", {
    timeZone: "America/Sao_Paulo", hour12: false,
  }); // HH:mm:ss
  const novaISO = `${data}T${hora}-03:00`;
  const { error } = await supabase.from("purchases").update({ data_hora: novaISO }).eq("id", id);
  if (error) throw new Error("Não foi possível mudar a data: " + error.message);
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/historico");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/relatorio");
}

export async function cancelarCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("cancelar_compra", { p_id: id, p_motivo: motivo });
  if (error) throw new Error("Não foi possível cancelar: " + error.message);
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/historico");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/materiais");
}

export async function excluirCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("excluir_compra", { p_id: id });
  if (error) throw new Error("Não foi possível excluir: " + error.message);
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/historico");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/materiais");
}
