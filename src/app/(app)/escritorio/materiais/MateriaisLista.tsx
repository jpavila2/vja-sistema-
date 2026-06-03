"use client";

import Link from "next/link";
import { TabelaBusca } from "@/components/TabelaBusca";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { formatBRL } from "@/lib/format";
import { alternarAtivoMaterial } from "./actions";
import type { Material } from "@/lib/types";

export function MateriaisLista({ materiais }: { materiais: Material[] }) {
  return (
    <TabelaBusca<Material>
      itens={materiais}
      campoBusca={(m) => m.nome}
      placeholder="Buscar material..."
      vazio="Nenhum material cadastrado."
      colunas={[
        { titulo: "Material", render: (m) => <span>{m.emoji} {m.nome}</span> },
        { titulo: "Categoria", render: (m) => m.categoria },
        { titulo: "Preço compra", render: (m) => formatBRL(m.preco_compra) },
        { titulo: "Preço venda", render: (m) => formatBRL(m.preco_venda) },
        {
          titulo: "Aparece em",
          render: (m) => (
            <span className="text-sm">
              {m.mostrar_balanca ? "⚖️" : ""}{m.mostrar_venda ? "📦" : ""}
              {!m.mostrar_balanca && !m.mostrar_venda ? "—" : ""}
            </span>
          ),
        },
        { titulo: "Estoque", render: (m) => `${m.estoque_atual} ${m.unidade}` },
        {
          titulo: "Status",
          render: (m) => (
            <span className={m.ativo ? "text-marca-green-dark" : "text-slate-400"}>
              {m.ativo ? "Ativo" : "Inativo"}
            </span>
          ),
        },
        {
          titulo: "Ações",
          render: (m) => (
            <div className="flex gap-2">
              <Link href={`/escritorio/materiais/editar/${m.id}`} className="text-marca-teal-dark">Editar</Link>
              <BotaoConfirmar
                acao={alternarAtivoMaterial}
                hidden={{ id: m.id, ativo: String(m.ativo) }}
                mensagem={m.ativo ? `Inativar ${m.nome}?` : `Reativar ${m.nome}?`}
                className="text-slate-500"
              >
                {m.ativo ? "Inativar" : "Reativar"}
              </BotaoConfirmar>
            </div>
          ),
        },
      ]}
    />
  );
}
