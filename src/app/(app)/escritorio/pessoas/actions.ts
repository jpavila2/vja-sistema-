"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pessoaSchema } from "@/lib/schemas/pessoa";

const LISTA = "/escritorio/pessoas";

export async function salvarPessoa(_prev: unknown, formData: FormData) {
  const parsed = pessoaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const supabase = await createClient();
  const id = formData.get("id");
  const dados = parsed.data;

  if (id) {
    const { error } = await supabase.from("people").update(dados).eq("id", Number(id));
    if (error) return { erro: error.message };
  } else {
    const { error } = await supabase.from("people").insert(dados);
    if (error) return { erro: error.message };
  }
  revalidatePath(LISTA);
  redirect(LISTA);
}

export async function alternarStatusPessoa(formData: FormData) {
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const statusAtual = String(formData.get("status"));
  const novo = statusAtual === "ativo" ? "inativo" : "ativo";
  await supabase.from("people").update({ status: novo }).eq("id", id);
  revalidatePath(LISTA);
}
