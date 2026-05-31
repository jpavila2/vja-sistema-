"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  material_id: z.number().int().positive(),
  peso_bruto: z.number().positive(),
  peso_liquido: z.number().positive(),
  preco_unitario: z.number().min(0),
});
const compraSchema = z.object({
  pessoa_id: z.number().int().positive().nullable(),
  catador_nome: z.string().trim().default(""),
  catador_telefone: z.string().trim().default(""),
  observacoes: z.string().trim().default(""),
  itens: z.array(itemSchema).min(1, "Compra sem itens"),
});
export type ResultadoCompra = { ok: true; id: number } | { ok: false; erro: string };

export async function registrarCompra(payload: unknown): Promise<ResultadoCompra> {
  const parsed = compraSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { pessoa_id, catador_nome, catador_telefone, observacoes, itens } = parsed.data;
  if (pessoa_id === null && catador_nome === "") return { ok: false, erro: "Informe o catador" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_compra", {
    p_pessoa_id: pessoa_id,
    p_catador_nome: catador_nome,
    p_catador_telefone: catador_telefone,
    p_observacoes: observacoes,
    p_itens: itens,
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/balanca");
  revalidatePath("/escritorio/materiais");
  return { ok: true, id: data as number };
}
