"use client";

import { useFormState, useFormStatus } from "react-dom";
import { salvarPessoa } from "./actions";
import { Campo } from "@/components/Campo";
import type { Pessoa } from "@/lib/types";

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

export function FormPessoa({ pessoa }: { pessoa?: Pessoa }) {
  const [state, formAction] = useFormState(salvarPessoa, estadoInicial);
  const inputCls = "w-full rounded-xl border p-3 text-base";
  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {pessoa ? <input type="hidden" name="id" value={pessoa.id} /> : null}
      {/* status preservado no editar (toggle é feito na lista); novo entra como 'ativo' */}
      <input type="hidden" name="status" value={pessoa?.status ?? "ativo"} />
      <Campo label="Nome / Razão social">
        <input name="nome" required defaultValue={pessoa?.nome ?? ""} className={inputCls} />
      </Campo>
      <Campo label="Tipo">
        <select name="tipo" defaultValue={pessoa?.tipo ?? "fornecedor"} className={inputCls}>
          <option value="fornecedor">Fornecedor (catador)</option>
          <option value="cliente">Cliente (indústria)</option>
          <option value="ambos">Ambos</option>
        </select>
      </Campo>
      <Campo label="CPF / CNPJ (opcional)">
        <input name="documento" defaultValue={pessoa?.documento ?? ""} className={inputCls} />
      </Campo>
      <Campo label="Telefone">
        <input name="telefone" defaultValue={pessoa?.telefone ?? ""} className={inputCls} />
      </Campo>
      <Campo label="WhatsApp">
        <input name="whatsapp" defaultValue={pessoa?.whatsapp ?? ""} className={inputCls} />
      </Campo>
      <Campo label="Endereço">
        <input name="endereco" defaultValue={pessoa?.endereco ?? ""} className={inputCls} />
      </Campo>
      <Campo label="Observações">
        <textarea name="observacoes" rows={3} defaultValue={pessoa?.observacoes ?? ""} className={inputCls} />
      </Campo>
      {state?.erro ? <p className="text-sm text-red-600">{state.erro}</p> : null}
      <Salvar />
    </form>
  );
}
