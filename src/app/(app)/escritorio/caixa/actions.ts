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
  const { inicio, fim } = limitesDoDiaBR(dia);

  // Recomputar saldo calculado no servidor para gravar diferença confiável
  const [{ data: sessao }, { data: movs }, { data: comprasD }, { data: vendasD }] =
    await Promise.all([
      supabase.from("cash_sessions").select("saldo_inicial").eq("dia", dia).maybeSingle(),
      supabase.from("cash_movements").select("tipo, valor").eq("dia", dia),
      supabase.from("purchases").select("total, status, forma_pagamento")
        .eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
      supabase.from("sales").select("total, status, forma_pagamento")
        .eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
    ]);

  const movimentos = (movs ?? []) as { tipo: string; valor: number }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = calcularSaldoCaixa({
    saldoInicial: sessao?.saldo_inicial ?? 0,
    saques:         movimentos.filter((m) => m.tipo === "saque").map((m) => Number(m.valor)),
    comprasDinheiro: ((comprasD ?? []) as {total:number;status:string}[])
      .filter((c) => c.status !== "cancelada").map((c) => Number(c.total)),
    despesas:       movimentos.filter((m) => m.tipo === "despesa").map((m) => Number(m.valor)),
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
  if (error) throw new Error("Não foi possível fechar o caixa: " + error.message);
  if (!data || data.length === 0) throw new Error("Caixa não está aberto para fechar.");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/");
}
