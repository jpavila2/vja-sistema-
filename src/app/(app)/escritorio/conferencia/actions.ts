"use server";

import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/supabase/guard";
import { normalizarPagamento } from "@/lib/pagamento";

const num = (v: FormDataEntryValue | null) => parseFloat(String(v ?? "").replace(",", ".")) || 0;

export async function conferirCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const formaRaw = String(formData.get("forma_pagamento") ?? "dinheiro");
  const pixDigitado = num(formData.get("valor_pix"));
  const { supabase, user } = await exigirPapel(["admin", "escritorio"]);
  // lê o total oficial da compra para normalizar/clampar o valor em PIX
  const { data: row, error: eRow } = await supabase
    .from("purchases").select("total").eq("id", id).eq("status", "pendente").single();
  if (eRow || !row) throw new Error("Compra não está pendente (já conferida ou cancelada).");
  const { forma_pagamento, valor_pix } = normalizarPagamento(formaRaw, pixDigitado, Number(row.total));
  // só confere o que está PENDENTE (evita re-conferir cancelada/já conferida)
  const { data, error } = await supabase.from("purchases")
    .update({ status: "conferida", forma_pagamento, valor_pix, conferida_por: user.id, conferida_em: new Date().toISOString() })
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
  valor_pix?: number;
  itens: ItemEdicao[];
}) {
  if (!input.itens || input.itens.length === 0) {
    throw new Error("A compra precisa de ao menos um item.");
  }
  const forma = input.forma_pagamento === "pix" ? "pix" : input.forma_pagamento === "misto" ? "misto" : "dinheiro";
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("editar_compra", {
    p_id: input.id,
    p_forma_pagamento: forma,
    p_valor_pix: forma === "misto" ? Math.max(0, input.valor_pix ?? 0) : 0,
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

/** Salva/atualiza os preços de compra próprios deste cliente (catador/fornecedor).
 *  preco null => volta ao preço de tabela. Mesmo mecanismo da balança. */
export async function salvarPrecosCliente(
  pessoaId: number,
  precos: { material_id: number; preco: number | null }[],
) {
  if (!pessoaId) throw new Error("Compra sem cliente cadastrado — não dá para salvar preços.");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("salvar_precos_catador", {
    p_pessoa_id: pessoaId,
    p_precos: precos,
  });
  if (error) throw new Error("Não foi possível salvar os preços do cliente: " + error.message);
  revalidatePath("/balanca");
}

export async function trocarFornecedorCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const pessoa_id = Number(formData.get("pessoa_id"));
  if (!id || !pessoa_id) throw new Error("Selecione um vendedor.");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.from("purchases").update({ pessoa_id }).eq("id", id);
  if (error) throw new Error("Não foi possível trocar o vendedor: " + error.message);
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/historico");
  revalidatePath("/");
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
