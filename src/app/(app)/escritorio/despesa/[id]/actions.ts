"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/supabase/guard";

export async function excluirDespesaDet(formData: FormData) {
  const id = Number(formData.get("id"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.from("cash_movements").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir: " + error.message);
  revalidatePath("/escritorio/historico");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/");
  redirect("/escritorio/historico");
}
