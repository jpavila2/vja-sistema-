"use server";

import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/supabase/guard";
import { limitesDoDiaBR } from "@/lib/datas";
import { calcularSaldoCaixa } from "@/lib/caixa-fisico";

/** Abre a sessão do dia (se não existir). saldo_inicial = saldo_contado do último dia fechado. */
export async function abrirCaixa(formData: FormData) {
  const dia = String(formData.get("dia"));
  const { supabase, user } = await exigirPapel(["admin", "escritorio"]);
  const { data: ult } = await supabase.from("cash_sessions")
    .select("saldo_contado").eq("status", "fechado").lt("dia", dia)
    .order("dia", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("cash_sessions").upsert(
    { dia, saldo_inicial: ult?.saldo_contado ?? 0, status: "aberto", aberto_por: user.id },
    { onConflict: "dia", ignoreDuplicates: true },
  );
  if (error) throw new Error("Não foi possível abrir o caixa: " + error.message);
  revalidatePath("/escritorio/caixa");
}

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

export async function lancarMovimento(formData: FormData): Promise<ResultadoAcao> {
  try {
    const dia = String(formData.get("dia"));
    const tipo = String(formData.get("tipo")); // saque | despesa
    const categoria = String(formData.get("categoria") ?? "");
    const descricao = String(formData.get("descricao") ?? "");
    const valor = Number(String(formData.get("valor")).replace(",", "."));
    const formaRaw = String(formData.get("forma_pagamento") ?? "dinheiro");
    const FORMAS = ["dinheiro", "pix", "transferencia", "boleto", "cheque"];
    const forma_pagamento = FORMAS.includes(formaRaw) ? formaRaw : "dinheiro";
    if (tipo !== "saque" && tipo !== "despesa") return { ok: false, erro: "Tipo inválido." };
    if (tipo === "despesa" && !categoria.trim()) return { ok: false, erro: "Escolha a categoria." };
    if (!(valor > 0)) return { ok: false, erro: "Informe um valor maior que zero." };
    const { supabase, user } = await exigirPapel(["admin", "escritorio"]);
    const { error } = await supabase.from("cash_movements").insert({
      dia, tipo, categoria: categoria || null, descricao: descricao || null, valor, forma_pagamento, created_by: user.id,
    });
    if (error) return { ok: false, erro: "Não foi possível lançar." };
    revalidatePath("/escritorio/caixa");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao lançar." };
  }
}

export async function removerMovimento(formData: FormData) {
  const id = Number(formData.get("id"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.from("cash_movements").delete().eq("id", id);
  if (error) throw new Error("Não foi possível remover: " + error.message);
  revalidatePath("/escritorio/caixa");
}

/** Corrige o saldo de abertura do dia (só com o caixa aberto). */
export async function editarSaldoInicial(input: { dia: string; valor: number }): Promise<ResultadoAcao> {
  if (!(input.valor >= 0)) return { ok: false, erro: "Informe um valor válido." };
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { data, error } = await supabase.from("cash_sessions")
    .update({ saldo_inicial: input.valor })
    .eq("dia", input.dia).eq("status", "aberto").select("id");
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  if (!data || data.length === 0) return { ok: false, erro: "Caixa não está aberto." };
  revalidatePath("/escritorio/caixa");
  revalidatePath("/");
  return { ok: true };
}

/** Edita um saque/despesa existente (só com o caixa aberto). */
export async function editarMovimento(input: {
  id: number; valor: number; descricao: string; categoria: string; tipo: string; forma_pagamento?: string;
}): Promise<ResultadoAcao> {
  if (!(input.valor > 0)) return { ok: false, erro: "Informe um valor maior que zero." };
  if (input.tipo === "despesa" && !input.categoria.trim()) return { ok: false, erro: "Escolha a categoria." };
  const FORMAS = ["dinheiro", "pix", "transferencia", "boleto", "cheque"];
  const forma_pagamento = FORMAS.includes(input.forma_pagamento ?? "") ? input.forma_pagamento! : "dinheiro";
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { error } = await supabase.from("cash_movements")
    .update({
      valor: input.valor,
      descricao: input.descricao.trim() || null,
      categoria: input.tipo === "despesa" ? (input.categoria.trim() || null) : null,
      forma_pagamento,
    })
    .eq("id", input.id);
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  revalidatePath("/escritorio/caixa");
  revalidatePath("/");
  return { ok: true };
}

/** Reabre um caixa fechado para correção (limpa o fechamento). */
export async function reabrirCaixa(formData: FormData) {
  const dia = String(formData.get("dia"));
  const { supabase } = await exigirPapel(["admin", "escritorio"]);
  const { data, error } = await supabase.from("cash_sessions")
    .update({
      status: "aberto",
      saldo_contado: null, saldo_calculado: null, diferenca: null,
      fechado_por: null, fechado_em: null,
    })
    .eq("dia", dia).eq("status", "fechado").select("id");
  if (error) throw new Error("Não foi possível reabrir: " + error.message);
  if (!data || data.length === 0) throw new Error("Caixa não está fechado.");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/");
}

export async function fecharCaixa(formData: FormData): Promise<ResultadoAcao> {
  try {
  const dia = String(formData.get("dia"));
  const contado = Number(String(formData.get("contado")).replace(",", "."));
  if (!(contado >= 0)) return { ok: false, erro: "Informe o valor contado." };

  const { supabase, user } = await exigirPapel(["admin", "escritorio"]);
  const { inicio, fim } = limitesDoDiaBR(dia);

  // Recomputar saldo calculado no servidor para gravar diferença confiável
  const [{ data: sessao }, { data: movs }, { data: comprasD }, { data: vendasD }] =
    await Promise.all([
      supabase.from("cash_sessions").select("saldo_inicial").eq("dia", dia).maybeSingle(),
      supabase.from("cash_movements").select("tipo, valor, forma_pagamento").eq("dia", dia),
      supabase.from("purchases").select("total, status, forma_pagamento")
        .eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
      supabase.from("sales").select("total, status, forma_pagamento")
        .eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
    ]);

  const movimentos = (movs ?? []) as { tipo: string; valor: number; forma_pagamento?: string }[];
  // só dinheiro mexe na gaveta; pix/transferência/etc ficam fora do caixa físico
  const emDinheiro = movimentos.filter((m) => (m.forma_pagamento ?? "dinheiro") === "dinheiro");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = calcularSaldoCaixa({
    saldoInicial: sessao?.saldo_inicial ?? 0,
    saques:         emDinheiro.filter((m) => m.tipo === "saque").map((m) => Number(m.valor)),
    comprasDinheiro: ((comprasD ?? []) as {total:number;status:string}[])
      .filter((c) => c.status !== "cancelada").map((c) => Number(c.total)),
    despesas:       emDinheiro.filter((m) => m.tipo === "despesa").map((m) => Number(m.valor)),
    vendasDinheiro: ((vendasD ?? []) as {total:number;status:string}[])
      .filter((v) => v.status !== "cancelada").map((v) => Number(v.total)),
    contado,
  });

  const { data, error } = await supabase.from("cash_sessions")
    .update({
      saldo_contado: contado,
      saldo_calculado: r.saldoCalculado,
      diferenca: r.diferenca,
      status: "fechado",
      fechado_por: user.id,
      fechado_em: new Date().toISOString(),
    })
    .eq("dia", dia).eq("status", "aberto").select("id");
  if (error) return { ok: false, erro: "Não foi possível fechar o caixa." };
  if (!data || data.length === 0) return { ok: false, erro: "Caixa não está aberto para fechar." };
  revalidatePath("/escritorio/caixa");
  revalidatePath("/");
  return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao fechar o caixa." };
  }
}
