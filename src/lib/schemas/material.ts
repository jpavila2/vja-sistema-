import { z } from "zod";

const checkbox = z.preprocess(
  (v) => v === "true" || v === "on" || v === true,
  z.boolean(),
);

export const materialSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto"),
  categoria: z.enum(["metal", "plastico", "papel", "eletronico", "outros"]),
  unidade: z.enum(["kg", "ton", "un"]),
  preco_compra: z.coerce.number().min(0, "Preço não pode ser negativo"),
  preco_venda: z.coerce.number().min(0, "Preço não pode ser negativo").default(0),
  estoque_minimo: z.coerce.number().min(0).default(0),
  emoji: z.string().trim().max(8).optional().or(z.literal("")),
  mostrar_balanca: checkbox,
  mostrar_venda: checkbox,
});

export type MaterialInput = z.infer<typeof materialSchema>;
