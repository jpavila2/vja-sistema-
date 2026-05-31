"use client";

import { abrirCaixa, lancarMovimento, fecharCaixa } from "./actions";

const inp = "rounded-xl border p-2 text-base";
const btnTeal = "rounded-full bg-marca-teal px-4 py-2 text-sm font-bold text-white hover:bg-marca-teal-dark";

export function BotaoAbrir({ dia }: { dia: string }) {
  return (
    <form action={abrirCaixa}>
      <input type="hidden" name="dia" value={dia} />
      <button className="rounded-full bg-marca-teal px-5 py-3 font-bold text-white hover:bg-marca-teal-dark">Abrir caixa do dia</button>
    </form>
  );
}

export function FormSaque({ dia }: { dia: string }) {
  return (
    <form action={lancarMovimento} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="tipo" value="saque" />
      <input name="descricao" placeholder="Descrição (ex: saque banco)" className={inp} />
      <input name="valor" inputMode="decimal" placeholder="Valor" className={inp + " w-28"} />
      <button className={btnTeal}>+ Saque (entrada)</button>
    </form>
  );
}

export function FormDespesa({ dia }: { dia: string }) {
  return (
    <form action={lancarMovimento} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="tipo" value="despesa" />
      <input name="categoria" list="categorias-despesa" placeholder="Categoria" className={inp} required />
      <datalist id="categorias-despesa">
        <option value="Combustível" />
        <option value="Segurança" />
        <option value="Alimentação / Café" />
        <option value="Manutenção / Pedágio" />
        <option value="Salário / Diária" />
        <option value="Aluguel" />
        <option value="Outros" />
      </datalist>
      <input name="descricao" placeholder="Descrição (ex: caminhão branco)" className={inp} />
      <input name="valor" inputMode="decimal" placeholder="Valor" className={inp + " w-28"} />
      <button className={btnTeal}>+ Despesa (saída)</button>
    </form>
  );
}

export function FormFechar({ dia }: { dia: string }) {
  return (
    <form action={fecharCaixa} className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => { if (!confirm("Fechar o caixa do dia? O saldo contado vira a abertura de amanhã.")) e.preventDefault(); }}>
      <input type="hidden" name="dia" value={dia} />
      <input name="contado" inputMode="decimal" placeholder="Dinheiro contado na gaveta" className={inp + " w-56"} required />
      <button className="rounded-full bg-marca-navy px-4 py-2 text-sm font-bold text-white">Fechar e conferir</button>
    </form>
  );
}
