import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR, limitesMes, limitesMesData, mesAtual, nomeMes } from "@/lib/datas";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";
import { GraficoEntrouSaiu } from "@/components/GraficoEntrouSaiu";
import { GraficoDespesas } from "@/components/GraficoDespesas";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default async function PainelPage({ searchParams }: { searchParams: { mes?: string } }) {
  const hoje = hojeBR();
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const ehMesAtual = mes === mesAtual();
  const { inicio: inicioDia, fim: fimDia } = limitesDoDiaBR(hoje);
  const { inicio: inicioMes, fim: fimMes }  = limitesMes(mes);
  const { ini: diaIniMes, fim: diaFimMes }  = limitesMesData(mes);
  const supabase = await createClient();

  const [
    { data: comprasHoje },
    { data: vendasHoje },
    { data: despesasHoje },
    { data: comprasMes },
    { data: vendasMes },
    { data: despesasMes },
    { data: materiaisData },
    { data: sessoesData },
    { data: profData },
  ] = await Promise.all([
    // compras de HOJE (com itens, p/ ver quais materiais entraram)
    supabase.from("purchases").select("total, status, purchase_items(peso_liquido, subtotal, materials(nome, emoji, unidade))")
      .gte("data_hora", inicioDia).lt("data_hora", fimDia),
    // vendas de HOJE
    supabase.from("sales").select("total, status").gte("data_hora", inicioDia).lt("data_hora", fimDia),
    // despesas de HOJE (cash_movements)
    supabase.from("cash_movements").select("valor").eq("tipo", "despesa").eq("dia", hoje),
    // compras do MÊS
    supabase.from("purchases").select("total, status")
      .gte("data_hora", inicioMes).lt("data_hora", fimMes),
    // vendas do MÊS
    supabase.from("sales").select("total, status")
      .gte("data_hora", inicioMes).lt("data_hora", fimMes),
    // despesas do MÊS (cash_movements tipo=despesa)
    supabase.from("cash_movements").select("valor, categoria")
      .eq("tipo", "despesa").gte("dia", diaIniMes).lt("dia", diaFimMes),
    // estoque atual
    supabase.from("materials").select("id, nome, emoji, unidade, estoque_atual, estoque_minimo, categoria")
      .eq("ativo", true).order("categoria").order("nome"),
    // últimas sessões de caixa (30 dias)
    supabase.from("cash_sessions").select("dia, saldo_inicial, saldo_contado, saldo_calculado, diferenca, status")
      .order("dia", { ascending: false }).limit(30),
    // papel do usuário
    supabase.from("profiles").select("papel").single(),
  ]);

  const isAdmin = profData?.papel === "admin";

  // ── Resumo do mês ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cH = ((comprasHoje as any[]) ?? []).filter((c) => c.status !== "cancelada");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cM = ((comprasMes  as any[]) ?? []).filter((c) => c.status !== "cancelada");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vM = ((vendasMes   as any[]) ?? []).filter((v) => v.status !== "cancelada");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dM = (despesasMes as any[]) ?? [];

  const totalCompradoHoje = r2(cH.reduce((s: number, c: {total: number}) => s + Number(c.total), 0));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vH = ((vendasHoje as any[]) ?? []).filter((v) => v.status !== "cancelada");
  const totalVendidoHoje = r2(vH.reduce((s: number, v: {total: number}) => s + Number(v.total), 0));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalDespesasHoje = r2(((despesasHoje as any[]) ?? []).reduce((s: number, d: {valor: number}) => s + Number(d.valor), 0));
  const resultadoDia = r2(totalVendidoHoje - totalCompradoHoje - totalDespesasHoje);

  // materiais comprados HOJE (quanto de cada um entrou)
  type MatHoje = { nome: string; emoji: string | null; unidade: string; peso: number; valor: number };
  const materiaisHoje = (Object.values(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cH as any[]).flatMap((c) => c.purchase_items ?? []).reduce((acc: Record<string, { nome: string; emoji: string | null; unidade: string; peso: number; valor: number }>, it: { peso_liquido: number; subtotal: number; materials: { nome: string; emoji: string | null; unidade: string } | null }) => {
      const nome = it.materials?.nome ?? "—";
      acc[nome] ??= { nome, emoji: it.materials?.emoji ?? null, unidade: it.materials?.unidade ?? "kg", peso: 0, valor: 0 };
      acc[nome].peso = r2(acc[nome].peso + Number(it.peso_liquido));
      acc[nome].valor = r2(acc[nome].valor + Number(it.subtotal));
      return acc;
    }, {}),
  ) as MatHoje[]).sort((a, b) => b.valor - a.valor);
  const totalCompradoMes  = r2(cM.reduce((s: number, c: {total: number}) => s + Number(c.total), 0));
  const totalVendidoMes   = r2(vM.reduce((s: number, v: {total: number}) => s + Number(v.total), 0));
  const totalDespesasMes  = r2(dM.reduce((s: number, d: {valor: number}) => s + Number(d.valor), 0));
  // Resultado de verdade: o que entrou menos tudo que saiu (compras E despesas).
  const resultadoLiquido  = r2(totalVendidoMes - totalCompradoMes - totalDespesasMes);

  // Despesas agrupadas por categoria (pro gráfico)
  const despesasPorCategoria = Object.values(
    dM.reduce((acc: Record<string, { categoria: string; valor: number }>, d: { valor: number; categoria: string | null }) => {
      const cat = d.categoria?.trim() || "Sem categoria";
      acc[cat] ??= { categoria: cat, valor: 0 };
      acc[cat].valor = r2(acc[cat].valor + Number(d.valor));
      return acc;
    }, {}),
  ) as { categoria: string; valor: number }[];

  // ── Estoque ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materiais = (materiaisData as any[]) ?? [];
  const semEstoque = materiais.filter((m) => m.estoque_atual <= 0);
  const estoqueBaixo = materiais.filter((m) => m.estoque_atual > 0 && m.estoque_atual <= m.estoque_minimo && m.estoque_minimo > 0);

  // ── Alertas de caixa ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessoes = (sessoesData as any[]) ?? [];
  const fechadas = sessoes.filter((s) => s.status === "fechado" && s.diferenca !== null);

  // Detectar anomalias e cruzamento entre dias adjacentes
  const anomalias: { dia: string; diferenca: number; nivel: "warn"|"crit" }[] = [];
  fechadas.forEach((s) => {
    const diff = Number(s.diferenca);
    if (Math.abs(diff) > 200) anomalias.push({ dia: s.dia, diferenca: diff, nivel: "crit" });
    else if (Math.abs(diff) > 50) anomalias.push({ dia: s.dia, diferenca: diff, nivel: "warn" });
  });

  // Cruzamento: dia[i] e dia[i+1] com sinais opostos e magnitudes parecidas
  const cruzamentos: { diaA: string; diaB: string; valA: number; valB: number }[] = [];
  for (let i = 0; i < fechadas.length - 1; i++) {
    const a = Number(fechadas[i].diferenca);
    const b = Number(fechadas[i + 1].diferenca);
    if (Math.abs(a) > 50 && Math.abs(b) > 50 && a * b < 0) {
      const razao = Math.abs(a) / Math.abs(b);
      if (razao > 0.5 && razao < 2) {
        cruzamentos.push({ diaA: fechadas[i].dia, diaB: fechadas[i + 1].dia, valA: a, valB: b });
      }
    }
  }

  return (
    <div className="space-y-6">

      {/* ── ações rápidas ── */}
      <div className="flex flex-wrap gap-3">
        <Link href="/balanca"
          className="rounded-full bg-marca-teal px-5 py-3 font-bold text-white hover:bg-marca-teal-dark">
          ⚖️ Nova compra
        </Link>
        {(isAdmin || true) && (
          <Link href="/escritorio/vendas"
            className="rounded-full bg-marca-navy px-5 py-3 font-bold text-white hover:opacity-90">
            📦 Nova venda
          </Link>
        )}
        <Link href="/escritorio/conferencia"
          className="rounded-full border px-5 py-3 font-bold text-marca-navy hover:bg-slate-100">
          Conferência
        </Link>
        <Link href="/escritorio/caixa"
          className="rounded-full border px-5 py-3 font-bold text-marca-navy hover:bg-slate-100">
          Caixa do dia
        </Link>
      </div>

      {/* ── hoje (só no mês corrente) ── */}
      {ehMesAtual && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Visão do dia</h2>
          {/* entrou × saiu do dia — bate o olho */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CardResumo titulo="Entrou (vendas)" valor={formatBRL(totalVendidoHoje)} cor="green" href={`/escritorio/vendas`} />
            <CardResumo titulo="Saiu (compras)" valor={formatBRL(totalCompradoHoje)} cor="gold" href={`/escritorio/conferencia?dia=${hoje}`} />
            <CardResumo titulo="Despesas" valor={formatBRL(totalDespesasHoje)} cor="navy" href={`/escritorio/caixa?dia=${hoje}`} />
            <CardResumo
              titulo="Resultado do dia"
              valor={formatBRL(Math.abs(resultadoDia))}
              cor={resultadoDia >= 0 ? "green" : "gold"}
              sufixo={resultadoDia >= 0 ? "▲ positivo" : "▼ negativo"}
              href={`/escritorio/caixa?dia=${hoje}`}
            />
          </div>

          {/* materiais comprados hoje */}
          <div className="mt-4 rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b bg-slate-50 p-3">
              <span className="font-bold text-marca-navy">Materiais comprados hoje</span>
              <Link href={`/escritorio/conferencia?dia=${hoje}`} className="text-xs font-semibold text-marca-teal-dark underline">ver compras</Link>
            </div>
            {materiaisHoje.length === 0 ? (
              <div className="p-5 text-center text-slate-400">Nenhuma compra registrada hoje.</div>
            ) : (
              <ul className="divide-y">
                {materiaisHoje.map((m) => (
                  <li key={m.nome} className="flex items-center gap-3 p-3">
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="flex-1 font-semibold text-slate-700">{m.nome}</span>
                    <span className="font-bold text-marca-navy">{m.peso.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {m.unidade}</span>
                    <span className="w-28 text-right font-extrabold text-marca-teal-dark">{formatBRL(m.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ── mês (com seletor) ── */}
      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {nomeMes(mes)}{ehMesAtual ? " (mês corrente)" : ""}
          </h2>
          <form className="flex items-center gap-2">
            <input type="month" name="mes" defaultValue={mes}
              className="rounded-lg border p-1.5 text-sm" />
            <button type="submit"
              className="rounded-lg bg-marca-teal px-3 py-1.5 text-sm font-bold text-white">Ver</button>
            <Link href="/" className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-600">Mês atual</Link>
            <Link href="/escritorio/relatorio" className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-marca-teal-dark">📊 Ano</Link>
          </form>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardResumo titulo="Vendido" valor={formatBRL(totalVendidoMes)} cor="green" href={`/escritorio/historico?mes=${mes}`} />
          <CardResumo titulo="Comprado" valor={formatBRL(totalCompradoMes)} cor="gold" href={`/escritorio/historico?mes=${mes}`} />
          <CardResumo titulo="Despesas" valor={formatBRL(totalDespesasMes)} cor="navy" href={`/escritorio/historico?mes=${mes}`} />
          <CardResumo
            titulo="Resultado do mês"
            valor={formatBRL(Math.abs(resultadoLiquido))}
            cor={resultadoLiquido >= 0 ? "green" : "gold"}
            sufixo={resultadoLiquido >= 0 ? "▲ lucro" : "▼ no vermelho"}
            href="/escritorio/relatorio"
          />
        </div>

        {/* gráficos */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-1 font-bold text-marca-navy">Entrou × Saiu</div>
            <p className="mb-4 text-xs text-slate-500">
              Vendido {formatBRL(totalVendidoMes)} − Comprado {formatBRL(totalCompradoMes)} − Despesas {formatBRL(totalDespesasMes)} ={" "}
              <b className={resultadoLiquido >= 0 ? "text-marca-green-dark" : "text-rose-600"}>
                {formatBRL(resultadoLiquido)}
              </b>
            </p>
            <GraficoEntrouSaiu
              vendido={totalVendidoMes}
              comprado={totalCompradoMes}
              despesas={totalDespesasMes}
            />
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-1 font-bold text-marca-navy">Despesas por categoria</div>
            <p className="mb-4 text-xs text-slate-500">Pra onde o dinheiro foi neste mês.</p>
            <GraficoDespesas itens={despesasPorCategoria} />
          </div>
        </div>
      </section>

      {/* ── estoque ── */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          Estoque atual
          {semEstoque.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 normal-case">
              {semEstoque.length} zerado(s)
            </span>
          )}
          {estoqueBaixo.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 normal-case">
              {estoqueBaixo.length} baixo(s)
            </span>
          )}
        </h2>
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3 font-semibold text-slate-600">Material</th>
                <th className="p-3 text-right font-semibold text-slate-600">Estoque</th>
                <th className="p-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {materiais.map((m) => {
                const zero = m.estoque_atual <= 0;
                const baixo = !zero && m.estoque_minimo > 0 && m.estoque_atual <= m.estoque_minimo;
                return (
                  <tr key={m.id} className="border-t hover:bg-slate-50">
                    <td className="p-3">
                      <Link href={`/escritorio/materiais/editar/${m.id}`} className="inline-flex items-center hover:underline">
                        <span className="mr-2">{m.emoji}</span>
                        {m.nome}
                      </Link>
                    </td>
                    <td className={"p-3 text-right font-bold " + (zero ? "text-red-600" : baixo ? "text-amber-600" : "text-marca-teal-dark")}>
                      {Number(m.estoque_atual).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {m.unidade}
                    </td>
                    <td className="p-3">
                      {zero ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">Zerado</span>
                      ) : baixo ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Baixo</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── caixa — alertas e histórico ── */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          Caixa — últimas sessões
          {anomalias.filter((a) => a.nivel === "crit").length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 normal-case">
              🔴 {anomalias.filter((a) => a.nivel === "crit").length} diferença(s) crítica(s)
            </span>
          )}
          {anomalias.filter((a) => a.nivel === "warn").length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 normal-case">
              🟡 {anomalias.filter((a) => a.nivel === "warn").length} diferença(s) a verificar
            </span>
          )}
        </h2>

        {cruzamentos.length > 0 && (
          <div className="mb-3 space-y-2">
            {cruzamentos.map((c, i) => (
              <div key={i} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                <span className="font-bold">⚠️ Possível erro entre {formatDia(c.diaB)} e {formatDia(c.diaA)}:</span>{" "}
                {c.diaB} teve {formatDiferenca(c.valB)} e {c.diaA} teve {formatDiferenca(c.valA)} de diferença —
                sinais opostos e valores próximos sugerem dinheiro contado no dia errado.{" "}
                <Link href={`/escritorio/caixa?dia=${c.diaB}`} className="underline">Ver {formatDia(c.diaB)}</Link>
                {" · "}
                <Link href={`/escritorio/caixa?dia=${c.diaA}`} className="underline">Ver {formatDia(c.diaA)}</Link>
              </div>
            ))}
          </div>
        )}

        {sessoes.length === 0 ? (
          <div className="rounded-2xl border bg-white p-5 text-center text-slate-400">Nenhuma sessão de caixa ainda.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-3 font-semibold text-slate-600">Dia</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Inicial</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Calculado</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Contado</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Diferença</th>
                  <th className="p-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((s) => {
                  const diff = s.diferenca !== null ? Number(s.diferenca) : null;
                  const crit = diff !== null && Math.abs(diff) > 200;
                  const warn = diff !== null && Math.abs(diff) > 50 && !crit;
                  return (
                    <tr key={s.dia} className={"border-t hover:bg-slate-50 " + (crit ? "bg-red-50" : warn ? "bg-amber-50" : "")}>
                      <td className="p-3">
                        <Link href={`/escritorio/caixa?dia=${s.dia}`}
                          className="font-medium text-marca-teal hover:underline">
                          {formatDia(s.dia)}
                        </Link>
                      </td>
                      <td className="p-3 text-right">{formatBRL(Number(s.saldo_inicial))}</td>
                      <td className="p-3 text-right">
                        {s.saldo_calculado !== null ? formatBRL(Number(s.saldo_calculado)) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {s.saldo_contado !== null ? formatBRL(Number(s.saldo_contado)) : "—"}
                      </td>
                      <td className={"p-3 text-right font-bold " + (
                        diff === null ? "text-slate-400" :
                        diff === 0 ? "text-emerald-600" :
                        crit ? "text-red-600" : warn ? "text-amber-600" : "text-slate-700"
                      )}>
                        {diff === null ? "—" : (
                          <>{diff > 0 ? "+" : ""}{formatBRL(diff)} {crit ? "🔴" : warn ? "🟡" : diff === 0 ? "✅" : ""}</>
                        )}
                      </td>
                      <td className="p-3">
                        {s.status === "fechado" ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Fechado</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Aberto</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDia(dia: string) {
  return new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit",
  });
}

function formatDiferenca(v: number) {
  return `${v > 0 ? "+" : ""}${formatBRL(v)}`;
}
