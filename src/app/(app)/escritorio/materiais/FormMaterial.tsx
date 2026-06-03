"use client";

import { useFormState, useFormStatus } from "react-dom";
import { salvarMaterial } from "./actions";
import { Campo } from "@/components/Campo";
import type { Material } from "@/lib/types";

const estadoInicial = { erro: "" };

function Salvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="rounded-full bg-marca-teal px-5 py-3 font-bold text-white hover:bg-marca-teal-dark disabled:opacity-50">
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

export function FormMaterial({ material }: { material?: Material }) {
  const [state, formAction] = useFormState(salvarMaterial, estadoInicial);
  const inputCls = "w-full rounded-xl border p-3 text-base";
  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {material ? <input type="hidden" name="id" value={material.id} /> : null}
      <Campo label="Nome">
        <input name="nome" required defaultValue={material?.nome ?? ""} className={inputCls} />
      </Campo>
      <Campo label="Categoria">
        <select name="categoria" defaultValue={material?.categoria ?? "metal"} className={inputCls}>
          <option value="metal">Metal</option>
          <option value="plastico">Plástico</option>
          <option value="papel">Papel</option>
          <option value="eletronico">Eletrônico</option>
          <option value="outros">Outros</option>
        </select>
      </Campo>
      <Campo label="Unidade">
        <select name="unidade" defaultValue={material?.unidade ?? "kg"} className={inputCls}>
          <option value="kg">kg</option>
          <option value="ton">tonelada</option>
          <option value="un">unidade</option>
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Preço de compra (R$)">
          <input name="preco_compra" type="number" step="0.01" min="0"
            defaultValue={material?.preco_compra ?? 0} className={inputCls} />
        </Campo>
        <Campo label="Preço de venda (R$)">
          <input name="preco_venda" type="number" step="0.01" min="0"
            defaultValue={material?.preco_venda ?? 0} className={inputCls} />
        </Campo>
      </div>
      <Campo label="Estoque mínimo">
        <input name="estoque_minimo" type="number" step="0.001" min="0"
          defaultValue={material?.estoque_minimo ?? 0} className={inputCls} />
      </Campo>
      <Campo label="Emoji (opcional)">
        <input name="emoji" maxLength={8} defaultValue={material?.emoji ?? ""} className={inputCls} />
      </Campo>
      <Campo label="Onde aparece">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-base">
            <input type="checkbox" name="mostrar_balanca" value="true"
              defaultChecked={material?.mostrar_balanca ?? true} className="h-5 w-5" />
            <span>⚖️ Balança (compra do catador)</span>
          </label>
          <label className="flex items-center gap-2 text-base">
            <input type="checkbox" name="mostrar_venda" value="true"
              defaultChecked={material?.mostrar_venda ?? true} className="h-5 w-5" />
            <span>📦 Vendas</span>
          </label>
        </div>
      </Campo>
      {state?.erro ? <p className="text-sm text-red-600">{state.erro}</p> : null}
      <Salvar />
    </form>
  );
}
