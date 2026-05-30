import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormMaterial } from "../../FormMaterial";
import type { Material } from "@/lib/types";

export default async function EditarMaterialPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data } = await supabase.from("materials").select("*").eq("id", Number(params.id)).single();
  if (!data) notFound();
  return (
    <div className="space-y-4">
      <Link href="/escritorio/materiais" className="text-blue-600">← Voltar</Link>
      <h1 className="text-2xl font-bold">Editar material</h1>
      <FormMaterial material={data as Material} />
    </div>
  );
}
