import { redirect } from "next/navigation";

// O Escritório abre direto no Caixa do dia; a navegação entre as seções
// (vendas, materiais, conferência, pessoas, relatório) fica na barra de ícones
// do layout do escritório.
export default function EscritorioPage() {
  redirect("/escritorio/caixa");
}
