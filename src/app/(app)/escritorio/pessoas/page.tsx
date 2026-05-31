import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PessoasLista } from "./PessoasLista";
import type { Pessoa } from "@/lib/types";

export default async function PessoasPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("*").order("nome");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pessoas (catadores / clientes)</h1>
        <Link href="/escritorio/pessoas/novo"
          className="rounded-full bg-marca-teal px-4 py-2 font-bold text-white hover:bg-marca-teal-dark">+ Nova pessoa</Link>
      </div>
      <PessoasLista pessoas={(data as Pessoa[]) ?? []} />
    </div>
  );
}
