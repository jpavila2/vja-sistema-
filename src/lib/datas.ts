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
