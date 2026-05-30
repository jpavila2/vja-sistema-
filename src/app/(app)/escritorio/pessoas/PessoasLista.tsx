"use client";

import Link from "next/link";
import { TabelaBusca } from "@/components/TabelaBusca";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { alternarStatusPessoa } from "./actions";
import type { Pessoa } from "@/lib/types";

const TIPO_LABEL: Record<Pessoa["tipo"], string> = {
  fornecedor: "Fornecedor",
  cliente: "Cliente",
  ambos: "Ambos",
};

export function PessoasLista({ pessoas }: { pessoas: Pessoa[] }) {
  return (
    <TabelaBusca<Pessoa>
      itens={pessoas}
      campoBusca={(p) => `${p.nome} ${p.telefone ?? ""} ${p.documento ?? ""}`}
      placeholder="Buscar por nome, telefone ou documento..."
      vazio="Nenhuma pessoa cadastrada."
      colunas={[
        { titulo: "Nome", render: (p) => p.nome },
        { titulo: "Tipo", render: (p) => TIPO_LABEL[p.tipo] },
        { titulo: "Telefone", render: (p) => p.telefone ?? "—" },
        {
          titulo: "Status",
          render: (p) => (
            <span className={p.status === "ativo" ? "text-green-700" : "text-slate-400"}>
              {p.status === "ativo" ? "Ativo" : "Inativo"}
            </span>
          ),
        },
        {
          titulo: "Ações",
          render: (p) => (
            <div className="flex gap-2">
              <Link href={`/escritorio/pessoas/editar/${p.id}`} className="text-blue-600">Editar</Link>
              <BotaoConfirmar
                acao={alternarStatusPessoa}
                hidden={{ id: p.id, status: p.status }}
                mensagem={p.status === "ativo" ? `Inativar ${p.nome}?` : `Reativar ${p.nome}?`}
                className="text-slate-500"
              >
                {p.status === "ativo" ? "Inativar" : "Reativar"}
              </BotaoConfirmar>
            </div>
          ),
        },
      ]}
    />
  );
}
