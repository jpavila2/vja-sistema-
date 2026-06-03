import { createClient } from "./server";
import type { Papel } from "@/lib/auth";

/**
 * Garante que o usuário logado tem um dos papéis exigidos (defesa em profundidade,
 * além da RLS). Lança erro se não autenticado, sem perfil, inativo ou sem permissão.
 * Devolve o client e o usuário para reuso na action.
 */
export async function exigirPapel(papeis: Papel[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const { data: prof } = await supabase
    .from("profiles").select("papel, ativo").eq("id", user.id).single();
  if (!prof || prof.ativo === false || !papeis.includes(prof.papel as Papel)) {
    throw new Error("Sem permissão para esta ação.");
  }
  return { supabase, user };
}
