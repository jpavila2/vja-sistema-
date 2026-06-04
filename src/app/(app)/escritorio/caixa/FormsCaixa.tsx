"use client";

import { useRef, useState, useTransition } from "react";
import { abrirCaixa, lancarMovimento, fecharCaixa } from "./actions";
import { CampoDinheiro } from "@/components/CampoDinheiro";

const inp = "rounded-xl border p-2 text-base";
const btnTeal = "rounded-full bg-marca-teal px-4 py-2 text-sm font-bold text-white hover:bg-marca-teal-dark disabled:opacity-50";

const CATEGORIAS_DESPESA = [
  "Combustível", "Segurança", "Alimentação / Café",
  "Manutenção / Pedágio", "Salário / Diária", "Aluguel",
];

type Msg = { ok: boolean; txt: string } | null;

function Aviso({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <span className={"text-sm font-bold " + (msg.ok ? "text-marca-green-dark" : "text-red-600")}>
      {msg.txt}
    </span>
  );
}

export function BotaoAbrir({ dia }: { dia: string }) {
  return (
    <form action={abrirCaixa}>
      <input type="hidden" name="dia" value={dia} />
      <button className="rounded-full bg-marca-teal px-5 py-3 font-bold text-white hover:bg-marca-teal-dark">Abrir caixa do dia</button>
    </form>
  );
}

export function FormSaque({ dia }: { dia: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [rk, setRk] = useState(0);
  const [pending, start] = useTransition();

  function enviar(fd: FormData) {
    start(async () => {
      const res = await lancarMovimento(fd);
      if (res.ok) { setMsg({ ok: true, txt: "✅ Saque lançado" }); formRef.current?.reset(); setRk((k) => k + 1); }
      else setMsg({ ok: false, txt: res.erro });
    });
  }

  return (
    <form ref={formRef} action={enviar} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="tipo" value="saque" />
      <input name="descricao" placeholder="Descrição (ex: saque banco)" className={inp} />
      <CampoDinheiro key={rk} name="valor" placeholder="R$ 0,00" className={inp + " w-32"} />
      <button disabled={pending} className={btnTeal}>{pending ? "Salvando…" : "+ Saque (entrada)"}</button>
      <Aviso msg={msg} />
    </form>
  );
}

export function FormDespesa({ dia }: { dia: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [cat, setCat] = useState("");
  const [outro, setOutro] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [rk, setRk] = useState(0);
  const [pending, start] = useTransition();
  const categoriaFinal = cat === "__outros__" ? outro.trim() : cat;

  function enviar(fd: FormData) {
    start(async () => {
      const res = await lancarMovimento(fd);
      if (res.ok) {
        setMsg({ ok: true, txt: "✅ Despesa lançada" });
        formRef.current?.reset(); setCat(""); setOutro(""); setRk((k) => k + 1);
      } else setMsg({ ok: false, txt: res.erro });
    });
  }

  return (
    <form ref={formRef} action={enviar} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="tipo" value="despesa" />
      <input type="hidden" name="categoria" value={categoriaFinal} />
      <select value={cat} onChange={(e) => setCat(e.target.value)} required
        className={inp + (cat ? "" : " text-slate-400")}>
        <option value="" disabled>Categoria…</option>
        {CATEGORIAS_DESPESA.map((c) => <option key={c} value={c}>{c}</option>)}
        <option value="__outros__">Outros (digitar)…</option>
      </select>
      {cat === "__outros__" && (
        <input value={outro} onChange={(e) => setOutro(e.target.value)} autoFocus required
          placeholder="Qual categoria?" className={inp} />
      )}
      <input name="descricao" placeholder="Descrição (ex: caminhão branco)" className={inp} />
      <CampoDinheiro key={rk} name="valor" placeholder="R$ 0,00" className={inp + " w-32"} />
      <button disabled={pending} className={btnTeal}>{pending ? "Salvando…" : "+ Despesa (saída)"}</button>
      <Aviso msg={msg} />
    </form>
  );
}

export function FormFechar({ dia }: { dia: string }) {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();

  function enviar(fd: FormData) {
    if (!confirm("Fechar o caixa do dia? O saldo contado vira a abertura de amanhã.")) return;
    start(async () => {
      const res = await fecharCaixa(fd);
      if (!res.ok) setMsg({ ok: false, txt: res.erro });
      // sucesso: a página recarrega mostrando "Caixa fechado"
    });
  }

  return (
    <form action={enviar} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="dia" value={dia} />
      <CampoDinheiro name="contado" placeholder="Dinheiro contado na gaveta" className={inp + " w-56"} />
      <button disabled={pending} className="rounded-full bg-marca-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "Fechando…" : "Fechar e conferir"}
      </button>
      <Aviso msg={msg} />
    </form>
  );
}
