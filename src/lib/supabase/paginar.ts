/**
 * O PostgREST devolve no máximo ~1000 linhas por consulta e corta o resto SEM erro.
 * Qualquer consulta que some um período (mês, ano) precisa passar por aqui, senão
 * o total sai menor que a realidade e ninguém percebe.
 *
 * Uso:
 *   const compras = await buscarTudo<Compra>((de, ate) =>
 *     supabase.from("purchases").select("total, status", { count: "exact" })
 *       .gte("data_hora", inicio).lt("data_hora", fim)
 *       .order("id", { ascending: true })   // ordem estável: sem ela a página repete/pula linha
 *       .range(de, ate));
 */
export const PAGINA = 1000;

export async function buscarTudo<T>(
  consulta: (
    de: number,
    ate: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => PromiseLike<{ data: any[] | null; error: any; count: number | null }>,
): Promise<T[]> {
  const todos: T[] = [];
  let de = 0;
  let total = Infinity;
  while (todos.length < total) {
    const { data, error, count } = await consulta(de, de + PAGINA - 1);
    if (error) throw new Error(error.message);
    if (typeof count === "number") total = count;
    const lote = (data ?? []) as T[];
    if (lote.length === 0) break;
    todos.push(...lote);
    de += lote.length;
  }
  return todos;
}
