export type Papel = "admin" | "escritorio" | "balanca";

// "/api" cobre as rotas de dados (ex.: exportação de CSV); a própria rota valida
// a sessão e o RLS limita o que cada papel enxerga.
const ACESSO: Record<Papel, string[]> = {
  admin: ["/", "/escritorio", "/balanca", "/api"],
  escritorio: ["/escritorio", "/balanca", "/api"],
  balanca: ["/balanca"],
};

/** rota base permitida para o papel (compara pelo primeiro segmento). */
export function rotaPermitida(papel: Papel, rota: string): boolean {
  const base = "/" + (rota.split("/")[1] ?? "");
  return ACESSO[papel].includes(base);
}

/** rota inicial padrão de cada papel. */
export function rotaInicial(papel: Papel): string {
  return papel === "admin" ? "/" : papel === "escritorio" ? "/escritorio" : "/balanca";
}
