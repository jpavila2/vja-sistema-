import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MateriaisLista } from "./MateriaisLista";
import type { Material } from "@/lib/types";

export default async function MateriaisPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("materials").select("*").order("nome");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Materiais</h1>
        <Link href="/escritorio/materiais/novo"
          className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">+ Novo material</Link>
      </div>
      <MateriaisLista materiais={(data as Material[]) ?? []} />
    </div>
  );
}
