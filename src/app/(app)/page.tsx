import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR, limitesMesBR, nomeMesAtual } from "@/lib/datas";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default async function PainelPage() {
  const hoje = hojeBR();
  const { inicio: inicioDia, fim: fimDia } = limitesDoDiaBR(hoje);
  const { inicio: inicioMes, fim: fimMes }  = limitesMesBR();
  const supabase = await createClient();

  const [
    { data: comprasHoje },
    { data: comprasMes },
    { data: vendasMes },
    { data: materiaisData },
    { data: sessoesData },
    { data: profData },
  ] = await Promise.all([
    // compras de HOJE
    supabase.from("purchases").select("total, status")
      .gte("data_hora", inicioDia).lt("data_hora", fimDia),
    // compras do MÊS
    supabase.from("purchases").select("total, status")
      .gte("data_hora", inicioMes).lt("data_hora", fimMes),
    // vendas do MÊS
    supabase.from("sales").select("total, status")
      .gte("data_hora", inicioMes).lt("data_hora", fimMes),
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

  const totalCompradoHoje = r2(cH.reduce((s: number, c: {total: number}) => s + Number(c.total), 0));
  const totalCompradoMes  = r2(cM.reduce((s: number, c: {total: number}) => s + Number(c.total), 0));
  const totalVendidoMes   = r2(vM.reduce((s: number, v: {total: number}) => s + Number(v.total), 0));
  const resultadoBruto    = r2(totalVendidoMes - totalCompradoMes);

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

      {/* ── hoje ── */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Hoje</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <CardResumo titulo="Comprado hoje" valor={formatBRL(totalCompradoHoje)} cor="teal" />
          <CardResumo titulo="Compras hoje" valor={cH.length} cor="navy" />
          <CardResumo titulo="Ticket médio" valor={formatBRL(cH.length ? r2(totalCompradoHoje / cH.length) : 0)} cor="gold" />
        </div>
      </section>

      {/* ── mês ── */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          {nomeMesAtual()} (mês corrente)
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <CardResumo titulo="Total comprado" valor={formatBRL(totalCompradoMes)} cor="gold" />
          <CardResumo titulo="Total vendido" valor={formatBRL(totalVendidoMes)} cor="green" />
          <CardResumo
            titulo="Resultado bruto"
            valor={formatBRL(Math.abs(resultadoBruto))}
            cor={resultadoBruto >= 0 ? "green" : "gold"}
            sufixo={resultadoBruto >= 0 ? "▲" : "▼ negativo"}
          />
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
                      <span className="mr-2">{m.emoji}</span>
                      {m.nome}
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
