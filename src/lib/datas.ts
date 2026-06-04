/** Janela [início, fim) de um dia (YYYY-MM-DD) no fuso America/Sao_Paulo (UTC-3), em ISO UTC. */
export function limitesDoDiaBR(dia: string): { inicio: string; fim: string } {
  const inicio = new Date(`${dia}T00:00:00-03:00`);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

/** Dia de hoje (YYYY-MM-DD) no fuso America/Sao_Paulo. */
export function hojeBR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/**
 * Janela [início, fim) do mês corrente no fuso BR.
 * Ex.: junho/2026 → inicio = "2026-06-01T03:00:00.000Z", fim = "2026-07-01T03:00:00.000Z"
 */
export function limitesMesBR(): { inicio: string; fim: string } {
  const hoje = hojeBR();                  // "YYYY-MM-DD"
  const [ano, mes] = hoje.split("-").map(Number);
  const inicio = new Date(`${ano}-${String(mes).padStart(2, "0")}-01T00:00:00-03:00`);
  const proximoMes = mes === 12 ? new Date(`${ano + 1}-01-01T00:00:00-03:00`) : new Date(`${ano}-${String(mes + 1).padStart(2, "0")}-01T00:00:00-03:00`);
  return { inicio: inicio.toISOString(), fim: proximoMes.toISOString() };
}

/** Nome do mês atual em pt-BR, ex: "junho". */
export function nomeMesAtual(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long", timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

/** Mês corrente no formato "YYYY-MM" (fuso BR). */
export function mesAtual(): string {
  return hojeBR().slice(0, 7);
}

/** Janela [início, fim) de um mês "YYYY-MM" no fuso BR, em ISO UTC. */
export function limitesMes(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split("-").map(Number);
  const inicio = new Date(`${ano}-${String(m).padStart(2, "0")}-01T00:00:00-03:00`);
  const prox = m === 12
    ? new Date(`${ano + 1}-01-01T00:00:00-03:00`)
    : new Date(`${ano}-${String(m + 1).padStart(2, "0")}-01T00:00:00-03:00`);
  return { inicio: inicio.toISOString(), fim: prox.toISOString() };
}

/** Bounds do mês como datas "YYYY-MM-DD" (pra colunas date, ex: cash_movements). */
export function limitesMesData(mes: string): { ini: string; fim: string } {
  const [ano, m] = mes.split("-").map(Number);
  const ini = `${ano}-${String(m).padStart(2, "0")}-01`;
  const fim = m === 12 ? `${ano + 1}-01-01` : `${ano}-${String(m + 1).padStart(2, "0")}-01`;
  return { ini, fim };
}

/** Nome do mês "YYYY-MM" em pt-BR, ex: "maio de 2026". */
export function nomeMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(ano, m - 1, 1));
}

/** Dia "YYYY-MM-DD" deslocado em `dias` (ex.: -1 = ontem, +1 = amanhã). */
export function diaAdjacente(dia: string, dias: number): string {
  const d = new Date(`${dia}T12:00:00-03:00`);
  d.setDate(d.getDate() + dias);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

/** Data "YYYY-MM-DD" por extenso, ex.: "ter, 3 de junho". */
export function dataExtenso(dia: string): string {
  return new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short", day: "numeric", month: "long",
  });
}

/** Ano corrente (fuso BR). */
export function anoAtual(): number {
  return Number(hojeBR().slice(0, 4));
}

/** Janela [início, fim) de um ano no fuso BR, em ISO UTC. */
export function limitesAno(ano: number): { inicio: string; fim: string } {
  const inicio = new Date(`${ano}-01-01T00:00:00-03:00`);
  const fim = new Date(`${ano + 1}-01-01T00:00:00-03:00`);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}
