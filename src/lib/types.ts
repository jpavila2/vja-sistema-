export type Categoria = "metal" | "plastico" | "papel" | "eletronico" | "outros";
export type Unidade = "kg" | "ton" | "un";

export type Material = {
  id: number;
  nome: string;
  categoria: Categoria;
  unidade: Unidade;
  preco_compra: number;
  estoque_atual: number;
  estoque_minimo: number;
  emoji: string | null;
  ativo: boolean;
};

export type TipoPessoa = "cliente" | "fornecedor" | "ambos";
export type StatusPessoa = "ativo" | "inativo";

export type Pessoa = {
  id: number;
  nome: string;
  tipo: TipoPessoa;
  documento: string | null;
  telefone: string | null;
  whatsapp: string | null;
  endereco: string | null;
  observacoes: string | null;
  status: StatusPessoa;
};
