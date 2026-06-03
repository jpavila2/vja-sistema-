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

export async function cancelarCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "");
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.rpc("cancelar_compra", { p_id: id, p_motivo: motivo });
  if (error) throw new Error("Não foi possível cancelar: " + error.message);
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/materiais");
}
