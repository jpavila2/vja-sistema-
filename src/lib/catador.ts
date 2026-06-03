/** Utilidades de busca/seleção de catador (fornecedor) na balança. */

export type CatadorOpt = { id: number; nome: string };

/** Normaliza para comparar nomes: minúsculas, sem acentos, espaços colapsados. */
export function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas combinantes)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Sugestões para o termo digitado (match por "contém", já normalizado). */
export function buscarCatadores(
  lista: CatadorOpt[],
  termo: string,
  limite = 8
): CatadorOpt[] {
  const t = normalizarNome(termo);
  if (t === "") return [];
  return lista.filter((c) => normalizarNome(c.nome).includes(t)).slice(0, limite);
}

/**
 * Resolve o catador a partir do texto digitado.
 * Só resolve quando há EXATAMENTE UM nome igual (normalizado) — evita lançar a
 * compra no catador errado quando há nomes parecidos ou duplicados.
 * - "ok": id único encontrado.
 * - "nenhum": texto não bate com ninguém (precisa escolher da lista ou cadastrar).
 * - "ambiguo": mais de um catador com o mesmo nome — precisa desambiguar.
 */
export function resolverCatador(
  lista: CatadorOpt[],
  termo: string
): { tipo: "ok"; id: number; nome: string } | { tipo: "nenhum" } | { tipo: "ambiguo"; opcoes: CatadorOpt[] } {
  const t = normalizarNome(termo);
  if (t === "") return { tipo: "nenhum" };
  const exatos = lista.filter((c) => normalizarNome(c.nome) === t);
  if (exatos.length === 1) return { tipo: "ok", id: exatos[0].id, nome: exatos[0].nome };
  if (exatos.length > 1) return { tipo: "ambiguo", opcoes: exatos };
  return { tipo: "nenhum" };
}
