"use server";

import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/supabase/guard";

/** Abre a sessão do dia (se não existir). saldo_inicial = saldo_contado do último dia fechado. */
export async function abrirCaixa(formData: FormData) {
  const dia = String(formData.get("dia"));
  const { supabase, user } = await exigirPapel(["admin", "escritorio"]);
  const { data: ult } = await supabase.from("cash_sessions")
    .select("saldo_contado").eq("status", "fechado").lt("dia", dia)
    .order("dia", { ascending: false }).limit(1).maybeSingle();
  // idempotente: se já existe sessão do dia, a unique(dia) faz "do nothing"
  const { error } = await supabase.from("cash_sessions").upsert(
    { dia, saldo_inicial: ult?.saldo_contado ?? 0, status: "aberto", aberto_por: user.id },
    { onConflict: "dia", ignoreDuplicates: true },
  );
  if (error) throw new Error("Não foi possível abrir o caixa: " + error.message);
  revalidatePath("/escritorio/caixa");
}

export async function lancarMovimento(formData: FormData) {
  const dia = String(formData.get("dia"));
  const tipo = String(formData.get("tipo")); // saque | despesa
  const categoria = String(formData.get("categoria") ?? "");
  const descricao = String(formData.get("descricao") ?? "");
  const valor = Number(String(formData.get("valor")).replace(",", "."));
  if (tipo !== "saque" && tipo !== "despesa") throw new Error("Tipo de lançamento inválido.");
  if (!(valor > 0)) throw new Error("Informe um valor maior que zero.");
  const { supabase, user } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.from("cash_movements").insert({
    dia, tipo, categoria: categoria || null, descricao: descricao || null, valor, created_by: user.id,
  });
  if (error) throw new Error("Não foi possível lançar: " + error.message);
  revalidatePath("/escritorio/caixa");
}

export async function removerMovimento(formData: FormData) {
  const id = Number(formData.get("id"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.from("cash_movements").delete().eq("id", id);
  if (error) throw new Error("Não foi possível remover: " + error.message);
  revalidatePath("/escritorio/caixa");
}

export async function fecharCaixa(formData: FormData) {
  const dia = String(formData.get("dia"));
  const contado = Number(String(formData.get("contado")).replace(",", "."));
  if (!(contado >= 0)) throw new Error("Informe o valor contado.");
  const { supabase, user } = await exigirPapel(["admin", "escritorio"]);
  const { data, error } = await supabase.from("cash_sessions")
    .update({ saldo_contado: contado, status: "fechado", fechado_por: user.id, fechado_em: new Date().toISOString() })
    .eq("dia", dia).eq("status", "aberto").select("id");
  if (error) throw new Error("Não foi possível fechar o caixa: " + error.message);
  if (!data || data.length === 0) throw new Error("Caixa não está aberto para fechar.");
  revalidatePath("/escritorio/caixa");
}
