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
          className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">+ Nova pessoa</Link>
      </div>
      <PessoasLista pessoas={(data as Pessoa[]) ?? []} />
    </div>
  );
}
