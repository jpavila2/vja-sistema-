export type Categoria = "metal" | "plastico" | "papel" | "eletronico" | "outros";
export type Unidade = "kg" | "ton" | "un";

export type Material = {
  id: number;
  nome: string;
  categoria: Categoria;
  unidade: Unidade;
  preco_compra: number;
  preco_venda: number;
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

export type ItemCesta = {
  material_id: number;
  nome: string;
  emoji: string | null;
  unidade: Unidade;
  preco_unitario: number;
  peso_bruto: number;
  peso_liquido: number;
  subtotal: number;
};

export type FormaPagamentoVenda = "dinheiro" | "pix" | "transferencia" | "boleto" | "cheque";
export type StatusVenda = "ativa" | "cancelada";

export type Sale = {
  id: number;
  pessoa_id: number;
  operador_id: string;
  data_hora: string;
  total: number;
  forma_pagamento: FormaPagamentoVenda;
  status: StatusVenda;
  motivo_cancelamento: string | null;
  observacoes: string | null;
};

export type SaleWithPessoa = Sale & { people: { nome: string } | null };

export type SaleItem = {
  id: number;
  sale_id: number;
  material_id: number;
  peso: number;
  preco_unitario: number;
  subtotal: number;
};

/** Item do carrinho de vendas (antes de salvar). */
export type ItemCarrinhoVenda = {
  material_id: number;
  nome: string;
  emoji: string | null;
  unidade: Unidade;
  preco_unitario: number;
  peso: number;
  subtotal: number;
};
