import { z } from "zod";

const opcional = z.string().trim().optional().or(z.literal(""));

export const pessoaSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto"),
  tipo: z.enum(["cliente", "fornecedor", "ambos"]),
  documento: opcional,
  telefone: opcional,
  whatsapp: opcional,
  endereco: opcional,
  observacoes: opcional,
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});

export type PessoaInput = z.infer<typeof pessoaSchema>;
