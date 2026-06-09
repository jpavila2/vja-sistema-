"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/supabase/guard";

export async function cancelarCompraDet(formData: FormData) {
  const id = Number(formData.get("id"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("cancelar_compra", { p_id: id, p_motivo: "cancelada no detalhe" });
  if (error) throw new Error("Não foi possível cancelar: " + error.message);
  revalidatePath(`/escritorio/compra/${id}`);
  revalidatePath("/escritorio/historico");
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/materiais");
}

export async function excluirCompraDet(formData: FormData) {
  const id = Number(formData.get("id"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("excluir_compra", { p_id: id });
  if (error) throw new Error("Não foi possível excluir: " + error.message);
  revalidatePath("/escritorio/historico");
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/materiais");
  redirect("/escritorio/historico");
}
