import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormPessoa } from "../../FormPessoa";
import { PrecosCatador, type MaterialPreco } from "../../PrecosCatador";
import type { Pessoa } from "@/lib/types";

export default async function EditarPessoaPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("*").eq("id", id).single();
  if (!data) notFound();
  const pessoa = data as Pessoa;
  const ehCatador = pessoa.tipo === "fornecedor" || pessoa.tipo === "ambos";

  let materiais: MaterialPreco[] = [];
  const precosIniciais: Record<number, number> = {};
  if (ehCatador) {
    const [{ data: mats }, { data: precos }] = await Promise.all([
      supabase.from("materials").select("id, nome, emoji, unidade, preco_compra")
        .eq("ativo", true).eq("mostrar_balanca", true).order("nome"),
      supabase.from("catador_precos").select("material_id, preco_compra").eq("pessoa_id", id),
    ]);
    materiais = (mats as MaterialPreco[]) ?? [];
    for (const r of (precos ?? []) as { material_id: number; preco_compra: number }[]) {
      precosIniciais[r.material_id] = Number(r.preco_compra);
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/escritorio/pessoas" className="text-marca-teal-dark">← Voltar</Link>
      <h1 className="text-2xl font-bold">Editar pessoa</h1>
      <FormPessoa pessoa={pessoa} />
      {ehCatador && materiais.length > 0 ? (
        <PrecosCatador pessoaId={id} materiais={materiais} precosIniciais={precosIniciais} />
      ) : null}
    </div>
  );
}
