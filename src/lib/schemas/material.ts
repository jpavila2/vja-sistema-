import { z } from "zod";

export const materialSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto"),
  categoria: z.enum(["metal", "plastico", "papel", "eletronico", "outros"]),
  unidade: z.enum(["kg", "ton", "un"]),
  preco_compra: z.coerce.number().min(0, "Preço não pode ser negativo"),
  estoque_minimo: z.coerce.number().min(0).default(0),
  emoji: z.string().trim().max(8).optional().or(z.literal("")),
});

export type MaterialInput = z.infer<typeof materialSchema>;
