import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormPessoa } from "../../FormPessoa";
import type { Pessoa } from "@/lib/types";

export default async function EditarPessoaPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("*").eq("id", Number(params.id)).single();
  if (!data) notFound();
  return (
    <div className="space-y-4">
      <Link href="/escritorio/pessoas" className="text-blue-600">← Voltar</Link>
      <h1 className="text-2xl font-bold">Editar pessoa</h1>
      <FormPessoa pessoa={data as Pessoa} />
    </div>
  );
}
