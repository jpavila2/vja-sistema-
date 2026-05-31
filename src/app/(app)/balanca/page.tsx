import { createClient } from "@/lib/supabase/server";
import { TelaBalanca } from "./TelaBalanca";
import type { Material, Pessoa } from "@/lib/types";

export default async function BalancaPage() {
  const supabase = await createClient();
  const [{ data: materiais }, { data: fornecedores }] = await Promise.all([
    supabase.from("materials").select("*").eq("ativo", true).order("nome"),
    supabase.from("people").select("id, nome").in("tipo", ["fornecedor", "ambos"]).eq("status", "ativo").order("nome"),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Compra — Balança</h1>
      <TelaBalanca
        materiais={(materiais as Material[]) ?? []}
        fornecedores={(fornecedores as Pick<Pessoa, "id" | "nome">[]) ?? []}
      />
    </div>
  );
}
