"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function conferirCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("purchases")
    .update({ status: "conferida", conferida_por: user?.id, conferida_em: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/escritorio/conferencia");
}

export async function cancelarCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "");
  const supabase = await createClient();
  await supabase.rpc("cancelar_compra", { p_id: id, p_motivo: motivo });
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/materiais");
}
