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
  // chave de idempotência: evita compra duplicada em duplo-clique/retry
  client_request_id: z.string().uuid().optional(),
});
export type ResultadoCompra = { ok: true; id: number } | { ok: false; erro: string };

export async function registrarCompra(payload: unknown): Promise<ResultadoCompra> {
  const parsed = compraSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { pessoa_id, catador_nome, catador_telefone, observacoes, itens, client_request_id } = parsed.data;
  if (pessoa_id === null && catador_nome === "") return { ok: false, erro: "Informe o catador" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_compra", {
    p_pessoa_id: pessoa_id,
    p_catador_nome: catador_nome,
    p_catador_telefone: catador_telefone,
    p_observacoes: observacoes,
    p_itens: itens,
    p_client_request_id: client_request_id ?? null,
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/balanca");
  revalidatePath("/escritorio/materiais");
  return { ok: true, id: data as number };
}

/** Cria um catador na hora (sem esperar finalizar a compra). */
export async function criarCatador(
  nome: string,
  telefone: string,
): Promise<{ ok: true; id: number; nome: string } | { ok: false; erro: string }> {
  const nomeLimpo = nome.trim();
  if (nomeLimpo === "") return { ok: false, erro: "Informe o nome do catador" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_catador", {
    p_nome: nomeLimpo,
    p_telefone: telefone.trim(),
  });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, id: data as number, nome: nomeLimpo };
}

export type CompraRecente = {
  id: number;
  quando: string;
  catador: string;
  total: number;
  forma_pagamento: string;
  status: string;
  client_request_id: string | null;
  itens: { nome: string; emoji: string | null; unidade: string; peso: number; preco: number; subtotal: number }[];
};

/** Últimas compras de qualquer aparelho (via RPC; a balança não lê purchases direto). */
export async function ultimasCompras(): Promise<CompraRecente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ultimas_compras", { p_limite: 40 });
  if (error) return [];
  return (data as CompraRecente[]) ?? [];
}

/** Preços próprios de um catador: mapa material_id -> preço. */
export async function precosDoCatador(pessoaId: number): Promise<Record<number, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catador_precos")
    .select("material_id, preco_compra")
    .eq("pessoa_id", pessoaId);
  const mapa: Record<number, number> = {};
  for (const r of (data ?? []) as { material_id: number; preco_compra: number }[]) {
    mapa[r.material_id] = Number(r.preco_compra);
  }
  return mapa;
}

/** Salva/atualiza os preços próprios de um catador. preco null => volta ao de tabela. */
export async function salvarPrecosCatador(
  pessoaId: number,
  precos: { material_id: number; preco: number | null }[],
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_precos_catador", {
    p_pessoa_id: pessoaId,
    p_precos: precos,
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/balanca");
  return { ok: true };
}
