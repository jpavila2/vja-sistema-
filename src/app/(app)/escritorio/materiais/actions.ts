"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { materialSchema } from "@/lib/schemas/material";

const LISTA = "/escritorio/materiais";

export async function salvarMaterial(_prev: unknown, formData: FormData) {
  const parsed = materialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const supabase = await createClient();
  const id = formData.get("id");
  const dados = parsed.data;

  if (id) {
    const { error } = await supabase.from("materials").update(dados).eq("id", Number(id));
    if (error) return { erro: error.message };
  } else {
    const { error } = await supabase.from("materials").insert(dados);
    if (error) return { erro: error.message };
  }
  revalidatePath(LISTA);
  redirect(LISTA);
}

export async function alternarAtivoMaterial(formData: FormData) {
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const ativoAtual = formData.get("ativo") === "true";
  await supabase.from("materials").update({ ativo: !ativoAtual }).eq("id", id);
  revalidatePath(LISTA);
}
