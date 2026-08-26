"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/supabase/guard";

export async function cancelarVendaDet(formData: FormData) {
  const id = Number(formData.get("id"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("cancelar_venda", { p_venda_id: id, p_motivo: "cancelada no detalhe" });
  if (error) throw new Error("Não foi possível cancelar: " + error.message);
  revalidatePath(`/escritorio/venda/${id}`);
  revalidatePath("/escritorio/historico");
  revalidatePath("/escritorio/vendas");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/areceber");
  revalidatePath("/");
}

export async function excluirVendaDet(formData: FormData) {
  const id = Number(formData.get("id"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("excluir_venda", { p_id: id });
  if (error) throw new Error("Não foi possível excluir: " + error.message);
  revalidatePath("/escritorio/historico");
  revalidatePath("/escritorio/vendas");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/areceber");
  revalidatePath("/escritorio/materiais");
  revalidatePath("/escritorio/relatorio");
  revalidatePath("/");
  redirect("/escritorio/historico");
}
