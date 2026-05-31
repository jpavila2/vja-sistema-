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
          className="rounded-full bg-marca-teal px-4 py-2 font-bold text-white hover:bg-marca-teal-dark">+ Novo material</Link>
      </div>
      <MateriaisLista materiais={(data as Material[]) ?? []} />
    </div>
  );
}
