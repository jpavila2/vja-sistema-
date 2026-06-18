import type { ItemCesta } from "@/lib/types";
import type { CatadorOpt } from "@/lib/catador";

export type ModoCatador = "conhecido" | "novo" | "avulso";

/** Pesagem em andamento (modal aberto, antes de adicionar o item à cesta). */
export type EmAndamento = {
  material_id: number;
  pesoStr: string;
  precoStr: string;
  bags: number;
  bagsCustom: boolean;
  kgBagStr: string;
  pct: number;
  pctStr: string;
};

/**
 * Uma comanda = uma pesagem aberta no aparelho. Guarda tudo que é preciso para
 * retomar exatamente onde parou: catador, itens já pesados e a pesagem em
 * andamento. Fica salva no localStorage (rascunho), nunca no banco até finalizar.
 */
export type Comanda = {
  id: string; // uuid local da comanda
  client_request_id: string; // idempotência ao registrar (evita duplicar)
  criadaEm: number;
  cesta: ItemCesta[];
  modo: ModoCatador;
  catadorSel: CatadorOpt | null;
  busca: string;
  novoNome: string;
  novoTel: string;
  salvarPrecos: boolean;
  emAndamento: EmAndamento | null;
};

export function novaComanda(): Comanda {
  return {
    id: crypto.randomUUID(),
    client_request_id: crypto.randomUUID(),
    criadaEm: Date.now(),
    cesta: [],
    modo: "avulso",
    catadorSel: null,
    busca: "",
    novoNome: "",
    novoTel: "",
    salvarPrecos: false,
    emAndamento: null,
  };
}

/** Nome curto da comanda para o "chip" na barra de comandas. */
export function rotuloComanda(c: Comanda): string {
  if (c.catadorSel) return c.catadorSel.nome;
  if (c.modo === "avulso") return "Avulso";
  if (c.modo === "novo" && c.novoNome.trim()) return c.novoNome.trim();
  if (c.busca.trim()) return c.busca.trim();
  return "Sem nome";
}

/** Payload de compra enfileirado para envio (mesmo formato de registrarCompra). */
export type CompraPayload = {
  pessoa_id: number | null;
  catador_nome: string;
  catador_telefone: string;
  observacoes: string;
  itens: { material_id: number; peso_bruto: number; peso_liquido: number; preco_unitario: number }[];
  client_request_id: string;
};
