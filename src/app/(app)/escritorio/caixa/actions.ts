"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function db() { return createClient(); }

/** Abre a sessão do dia (se não existir). saldo_inicial = saldo_contado do último dia fechado. */
export async function abrirCaixa(formData: FormData) {
  const dia = String(formData.get("dia"));
  const supabase = await db();
  const { data: existe } = await supabase.from("cash_sessions").select("id").eq("dia", dia).maybeSingle();
  if (existe) { revalidatePath("/escritorio/caixa"); return; }
  const { data: ult } = await supabase.from("cash_sessions")
    .select("saldo_contado").eq("status", "fechado").lt("dia", dia)
    .order("dia", { ascending: false }).limit(1).maybeSingle();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("cash_sessions").insert({
    dia, saldo_inicial: ult?.saldo_contado ?? 0, status: "aberto", aberto_por: user?.id,
  });
  revalidatePath("/escritorio/caixa");
}

export async function lancarMovimento(formData: FormData) {
  const dia = String(formData.get("dia"));
  const tipo = String(formData.get("tipo")); // saque | despesa
  const categoria = String(formData.get("categoria") ?? "");
  const descricao = String(formData.get("descricao") ?? "");
  const valor = Number(String(formData.get("valor")).replace(",", "."));
  if (!(valor > 0)) return;
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("cash_movements").insert({
    dia, tipo, categoria: categoria || null, descricao: descricao || null, valor, created_by: user?.id,
  });
  revalidatePath("/escritorio/caixa");
}

export async function removerMovimento(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await db();
  await supabase.from("cash_movements").delete().eq("id", id);
  revalidatePath("/escritorio/caixa");
}

export async function fecharCaixa(formData: FormData) {
  const dia = String(formData.get("dia"));
  const contado = Number(String(formData.get("contado")).replace(",", "."));
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("cash_sessions")
    .update({ saldo_contado: contado, status: "fechado", fechado_por: user?.id, fechado_em: new Date().toISOString() })
    .eq("dia", dia);
  revalidatePath("/escritorio/caixa");
}
