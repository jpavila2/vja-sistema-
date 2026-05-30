"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rotaInicial, type Papel } from "@/lib/auth";

export async function login(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error || !data.user) {
    return { erro: "E-mail ou senha inválidos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("papel")
    .eq("id", data.user.id)
    .single();

  redirect(rotaInicial((profile?.papel as Papel) ?? "balanca"));
}
