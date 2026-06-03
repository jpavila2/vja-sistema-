import { createClient } from "@/lib/supabase/server";
import { TelaBalanca } from "./TelaBalanca";
import type { Material, Pessoa } from "@/lib/types";

export default async function BalancaPage() {
  const supabase = await createClient();
  const [{ data: materiais }, { data: pessoas }] = await Promise.all([
    supabase.from("materials").select("*").eq("ativo", true).eq("mostrar_balanca", true).order("nome"),
    supabase.from("people").select("id, nome").in("tipo", ["fornecedor", "ambos"]).eq("status", "ativo").order("nome"),
  ]);
  const todas = (pessoas as Pick<Pessoa, "id" | "nome">[]) ?? [];
  const avulso = todas.find((p) => p.nome === "Avulso") ?? null;
  const fornecedores = todas.filter((p) => p.nome !== "Avulso");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-marca-navy">Compra — Balança</h1>
      <TelaBalanca
        materiais={(materiais as Material[]) ?? []}
        fornecedores={fornecedores}
        avulsoId={avulso?.id ?? null}
      />
    </div>
  );
}
