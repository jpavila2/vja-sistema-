"use client";

import { useRef, useState, useTransition } from "react";
import {
  abrirCaixa, lancarMovimento, fecharCaixa,
  editarSaldoInicial, editarMovimento, reabrirCaixa,
} from "./actions";
import { removerMovimento } from "./actions";
import { CampoDinheiro } from "@/components/CampoDinheiro";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { formatBRL } from "@/lib/format";

const inp = "rounded-xl border p-2 text-base";
const erroCls = " border-red-500 ring-1 ring-red-500";
const btnGreen = "rounded-full bg-marca-green px-4 py-2 text-sm font-bold text-white hover:bg-marca-green-dark disabled:opacity-50";
const btnRed = "rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50";

const CATEGORIAS_DESPESA = [
  "Combustível", "Segurança", "Alimentação / Café",
  "Manutenção / Pedágio", "Salário / Diária", "Aluguel",
];

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

const FORMAS_PGTO = [
  { v: "dinheiro", label: "💵 Dinheiro (gaveta)" },
  { v: "pix", label: "📲 PIX (fora do caixa)" },
  { v: "transferencia", label: "🏦 Transferência (fora do caixa)" },
  { v: "boleto", label: "📄 Boleto (fora do caixa)" },
  { v: "cheque", label: "📑 Cheque (fora do caixa)" },
];
const FORMA_CURTA: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX", transferencia: "Transferência", boleto: "Boleto", cheque: "Cheque",
};

/** Leva o foco e a rolagem direto pro campo com problema. */
function focarCampo(id: string) {
  const el = document.getElementById(id);
  el?.focus();
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
}

type Msg = { ok: boolean; txt: string } | null;

function Aviso({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <span className={"text-sm font-bold " + (msg.ok ? "text-marca-green-dark" : "text-red-600")}>
      {msg.txt}
    </span>
  );
}

/** Marcador vermelho com ✗ apontando o campo que precisa ser resolvido. */
function Falta({ texto }: { texto: string }) {
  return <span className="flex items-center gap-1 text-sm font-bold text-red-600">✗ {texto}</span>;
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
  const [erro, setErro] = useState<"" | "valor">("");
  const [rk, setRk] = useState(0);
  const [pending, start] = useTransition();

  function enviar(fd: FormData) {
    if (!(num(String(fd.get("valor") ?? "")) > 0)) {
      setErro("valor"); setMsg(null); focarCampo("saque-valor");
      return;
    }
    setErro("");
    start(async () => {
      const res = await lancarMovimento(fd);
      if (res.ok) { setMsg({ ok: true, txt: "✅ Saque lançado" }); formRef.current?.reset(); setRk((k) => k + 1); }
      else { setMsg({ ok: false, txt: res.erro }); setErro("valor"); focarCampo("saque-valor"); }
    });
  }

  return (
    <form ref={formRef} action={enviar} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="tipo" value="saque" />
      <input name="descricao" placeholder="Descrição (ex: saque banco)" className={inp} />
      <select name="forma_pagamento" defaultValue="dinheiro" aria-label="Forma de pagamento" className={inp + " text-sm"}>
        {FORMAS_PGTO.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
      </select>
      <CampoDinheiro key={rk} id="saque-valor" erro={erro === "valor"} name="valor" placeholder="R$ 0,00" className={inp + " w-32"} />
      <button disabled={pending} className={btnGreen}>{pending ? "Salvando…" : "+ Saque (entrada)"}</button>
      {erro === "valor" ? <Falta texto="informe o valor" /> : <Aviso msg={msg} />}
    </form>
  );
}

export function FormDespesa({ dia }: { dia: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [cat, setCat] = useState("");
  const [outro, setOutro] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [erro, setErro] = useState<"" | "categoria" | "valor">("");
  const [rk, setRk] = useState(0);
  const [pending, start] = useTransition();
  const categoriaFinal = cat === "__outros__" ? outro.trim() : cat;

  function enviar(fd: FormData) {
    if (!categoriaFinal) {
      setErro("categoria"); setMsg(null);
      focarCampo(cat === "__outros__" ? "desp-outro" : "desp-cat");
      return;
    }
    if (!(num(String(fd.get("valor") ?? "")) > 0)) {
      setErro("valor"); setMsg(null); focarCampo("desp-valor");
      return;
    }
    setErro("");
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
      <select id="desp-cat" value={cat} onChange={(e) => { setCat(e.target.value); if (erro === "categoria") setErro(""); }}
        className={inp + (cat ? "" : " text-slate-400") + (erro === "categoria" ? erroCls : "")}>
        <option value="" disabled>Categoria…</option>
        {CATEGORIAS_DESPESA.map((c) => <option key={c} value={c}>{c}</option>)}
        <option value="__outros__">Outros (digitar)…</option>
      </select>
      {cat === "__outros__" && (
        <input id="desp-outro" value={outro} onChange={(e) => { setOutro(e.target.value); if (erro === "categoria") setErro(""); }} autoFocus
          placeholder="Qual categoria?" className={inp + (erro === "categoria" ? erroCls : "")} />
      )}
      <input name="descricao" placeholder="Descrição (ex: caminhão branco)" className={inp} />
      <select name="forma_pagamento" defaultValue="dinheiro" aria-label="Forma de pagamento" className={inp + " text-sm"}>
        {FORMAS_PGTO.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
      </select>
      <CampoDinheiro key={rk} id="desp-valor" erro={erro === "valor"} name="valor" placeholder="R$ 0,00" className={inp + " w-32"} />
      <button disabled={pending} className={btnRed}>{pending ? "Salvando…" : "+ Despesa (saída)"}</button>
      {erro === "categoria" ? <Falta texto="escolha a categoria" />
        : erro === "valor" ? <Falta texto="informe o valor" />
        : <Aviso msg={msg} />}
    </form>
  );
}

export function FormFechar({ dia }: { dia: string }) {
  const [msg, setMsg] = useState<Msg>(null);
  const [erro, setErro] = useState<"" | "contado">("");
  const [pending, start] = useTransition();

  function enviar(fd: FormData) {
    if (!String(fd.get("contado") ?? "")) {
      setErro("contado"); setMsg(null); focarCampo("fechar-contado");
      return;
    }
    if (!confirm("Fechar o caixa do dia? O saldo contado vira a abertura de amanhã.")) return;
    setErro("");
    start(async () => {
      const res = await fecharCaixa(fd);
      if (!res.ok) { setMsg({ ok: false, txt: res.erro }); setErro("contado"); focarCampo("fechar-contado"); }
      // sucesso: a página recarrega mostrando "Caixa fechado"
    });
  }

  return (
    <form action={enviar} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="dia" value={dia} />
      <CampoDinheiro id="fechar-contado" erro={erro === "contado"} name="contado" placeholder="Dinheiro contado na gaveta" className={inp + " w-56"} />
      <button disabled={pending} className="rounded-full bg-marca-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "Fechando…" : "Fechar e conferir"}
      </button>
      {erro === "contado" ? <Falta texto="conte e informe o dinheiro da gaveta" /> : <Aviso msg={msg} />}
    </form>
  );
}

/** Saldo de abertura com ✏️ pra corrigir (só com o caixa aberto). */
export function SaldoInicialEditavel({ dia, valor }: { dia: string; valor: number }) {
  const [editando, setEditando] = useState(false);
  const [str, setStr] = useState(String(valor).replace(".", ","));
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();

  function salvar() {
    start(async () => {
      const res = await editarSaldoInicial({ dia, valor: num(str) });
      if (res.ok) { setEditando(false); setMsg(null); }
      else setMsg({ ok: false, txt: res.erro });
    });
  }

  if (!editando) {
    return (
      <button onClick={() => { setStr(String(valor).replace(".", ",")); setEditando(true); }}
        title="Corrigir saldo inicial"
        className="inline-flex items-center gap-1 text-base font-extrabold text-marca-navy sm:text-lg">
        {formatBRL(valor)} <span className="text-xs text-slate-400">✏️</span>
      </button>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1">
      <input inputMode="decimal" value={str} onChange={(e) => setStr(e.target.value)} autoFocus
        aria-label="Saldo inicial" className="w-24 rounded-lg border p-1 text-center text-base font-bold" />
      <button onClick={salvar} disabled={pending} className="rounded bg-marca-green px-2 py-1 text-xs font-bold text-white">
        {pending ? "…" : "✓"}
      </button>
      <button onClick={() => { setEditando(false); setMsg(null); }} className="rounded bg-slate-200 px-2 py-1 text-xs font-bold">✕</button>
      {msg && !msg.ok ? <span className="text-xs font-bold text-red-600">{msg.txt}</span> : null}
    </div>
  );
}

type Movimento = { id: number; tipo: string; categoria: string | null; descricao: string | null; valor: number; forma_pagamento?: string };

/** Linha de saque/despesa com editar (✏️) e remover (🗑️), quando o caixa está aberto. */
export function LinhaMovimento({ m, podeEditar }: { m: Movimento; podeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [valorStr, setValorStr] = useState(String(m.valor).replace(".", ","));
  const [descricao, setDescricao] = useState(m.descricao ?? "");
  const [cat, setCat] = useState(m.categoria && CATEGORIAS_DESPESA.includes(m.categoria) ? m.categoria : (m.categoria ? "__outros__" : ""));
  const [outro, setOutro] = useState(m.categoria && !CATEGORIAS_DESPESA.includes(m.categoria) ? m.categoria : "");
  const [forma, setForma] = useState(m.forma_pagamento ?? "dinheiro");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const categoriaFinal = cat === "__outros__" ? outro.trim() : cat;

  function salvar() {
    start(async () => {
      const res = await editarMovimento({
        id: m.id, valor: num(valorStr), descricao, categoria: categoriaFinal, tipo: m.tipo, forma_pagamento: forma,
      });
      if (res.ok) { setEditando(false); setMsg(null); }
      else setMsg({ ok: false, txt: res.erro });
    });
  }

  if (editando) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b p-3 last:border-0">
        {m.tipo === "despesa" ? (
          <>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={inp + " text-sm"}>
              <option value="" disabled>Categoria…</option>
              {CATEGORIAS_DESPESA.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__outros__">Outros…</option>
            </select>
            {cat === "__outros__" ? (
              <input value={outro} onChange={(e) => setOutro(e.target.value)} placeholder="Qual?" className={inp + " w-32 text-sm"} />
            ) : null}
          </>
        ) : null}
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição"
          className={inp + " min-w-[8rem] flex-1 text-sm"} />
        <select value={forma} onChange={(e) => setForma(e.target.value)} aria-label="Forma de pagamento" className={inp + " text-sm"}>
          {FORMAS_PGTO.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
        </select>
        <input inputMode="decimal" value={valorStr} onChange={(e) => setValorStr(e.target.value)} aria-label="Valor"
          className={inp + " w-24 text-center text-sm font-bold"} />
        <button onClick={salvar} disabled={pending} className="rounded-full bg-marca-green px-3 py-1.5 text-xs font-bold text-white">
          {pending ? "…" : "💾 Salvar"}
        </button>
        <button onClick={() => { setEditando(false); setMsg(null); }} className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold">Cancelar</button>
        {msg && !msg.ok ? <span className="text-xs font-bold text-red-600">{msg.txt}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b p-3 last:border-0">
      <span className={"rounded-full px-2 py-0.5 text-xs font-bold " +
        (m.tipo === "saque" ? "bg-marca-green-dark/10 text-marca-green-dark" : "bg-marca-gold-light text-marca-gold")}>
        {m.tipo === "saque" ? "Saque" : m.categoria ?? "Despesa"}
      </span>
      <span className="text-slate-600">{m.descricao}</span>
      {(m.forma_pagamento ?? "dinheiro") !== "dinheiro" ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
          {FORMA_CURTA[m.forma_pagamento ?? "dinheiro"]}
        </span>
      ) : null}
      <span className={"ml-auto font-bold " + (m.tipo === "saque" ? "text-marca-green-dark" : "text-red-600")}>
        {m.tipo === "saque" ? "+" : "−"}{formatBRL(Number(m.valor))}
      </span>
      {podeEditar ? (
        <>
          <button onClick={() => setEditando(true)} title="Editar" className="text-slate-400 hover:text-marca-teal-dark">✏️</button>
          <BotaoConfirmar acao={removerMovimento} hidden={{ id: m.id }}
            mensagem="Remover este lançamento?" className="text-slate-400">🗑️</BotaoConfirmar>
        </>
      ) : null}
    </div>
  );
}

/** Reabre um caixa fechado pra correção. */
export function BotaoReabrir({ dia }: { dia: string }) {
  function confirmar(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm("Reabrir o caixa deste dia? O fechamento atual (contado/diferença) será apagado e você precisará fechar de novo.")) {
      e.preventDefault();
    }
  }
  return (
    <form action={reabrirCaixa} onSubmit={confirmar} className="mt-3">
      <input type="hidden" name="dia" value={dia} />
      <button className="rounded-full border border-marca-navy px-4 py-2 text-sm font-bold text-marca-navy hover:bg-slate-50">
        🔓 Reabrir caixa
      </button>
    </form>
  );
}
