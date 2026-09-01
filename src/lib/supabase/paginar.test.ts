import { describe, it, expect } from "vitest";
import { buscarTudo } from "@/lib/supabase/paginar";

/** Simula o PostgREST: `total` linhas no banco, devolvendo no máximo `maxRows` por vez. */
function fakeConsulta(total: number, maxRows = 1000) {
  const chamadas: [number, number][] = [];
  const linhas = Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
  const consulta = async (de: number, ate: number) => {
    chamadas.push([de, ate]);
    const fim = Math.min(ate + 1, de + maxRows, total);
    return { data: linhas.slice(de, fim), error: null, count: total };
  };
  return { consulta, chamadas };
}

describe("buscarTudo", () => {
  it("traz tudo quando cabe numa página só", async () => {
    const { consulta, chamadas } = fakeConsulta(37);
    const r = await buscarTudo<{ id: number }>(consulta);
    expect(r).toHaveLength(37);
    expect(chamadas).toHaveLength(1);
  });

  it("pagina até completar o total (caso que cortava o mês em 1000)", async () => {
    const { consulta } = fakeConsulta(2350);
    const r = await buscarTudo<{ id: number }>(consulta);
    expect(r).toHaveLength(2350);
    expect(r[0].id).toBe(1);
    expect(r[2349].id).toBe(2350);
  });

  it("não repete nem pula linha", async () => {
    const { consulta } = fakeConsulta(2350);
    const r = await buscarTudo<{ id: number }>(consulta);
    expect(new Set(r.map((x) => x.id)).size).toBe(2350);
  });

  it("funciona quando o servidor devolve menos que a página pedida", async () => {
    const { consulta, chamadas } = fakeConsulta(1200, 500);
    const r = await buscarTudo<{ id: number }>(consulta);
    expect(r).toHaveLength(1200);
    expect(chamadas.length).toBeGreaterThan(2);
  });

  it("banco vazio não trava", async () => {
    const { consulta } = fakeConsulta(0);
    expect(await buscarTudo(consulta)).toEqual([]);
  });

  it("propaga erro em vez de devolver dado pela metade", async () => {
    await expect(
      buscarTudo(async () => ({ data: null, error: { message: "boom" }, count: null })),
    ).rejects.toThrow("boom");
  });
});
