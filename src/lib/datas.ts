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
