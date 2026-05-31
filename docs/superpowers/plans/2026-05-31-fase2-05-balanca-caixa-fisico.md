# Plano 5 — Ajustes da balança + Caixa físico (Fase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Passos com checkbox `- [ ]`.

**Goal:** (1) Balança: desconto de impureza por **% (botões 5/10 + custom)** e catador com **conhecido / cadastro rápido / avulso**. (2) **Caixa físico**: controle diário de dinheiro em espécie — saldo de abertura (= contado de ontem) + saques − compras em dinheiro − despesas = saldo calculado; no fechamento conta-se o físico e registra-se a diferença.

**Architecture:** A impureza % é só cálculo no client (líquido = bruto×(1−%)). O catador usa a função `registrar_compra` (estendida com telefone) e um registro semente "Avulso". O caixa físico são tabelas novas `cash_sessions` e `cash_movements` com RLS só para admin/escritório, manipuladas por Server Actions (sem SECURITY DEFINER — escritório/admin têm RLS de escrita). Lógica de saldo em helpers puros (TDD).

**Tech Stack:** Next.js 14, TS, Tailwind (`marca-*`), Supabase, Zod, Vitest. Projeto: `zwgexgghhbtjmkxiqxis`.

**Base:** `registrar_compra`, `purchases` (forma_pagamento), `people`, tema, `@/lib/format`, `@/lib/datas` (`hojeBR`, `limitesDoDiaBR`), `CardResumo`, `Campo`, `BotaoConfirmar`.

---

## Task 1: Migration 0005 — Avulso, registrar_compra c/ telefone, caixa

**Files:** Supabase (MCP) + `supabase/migrations/0005_caixa_fisico.sql`

- [ ] **Step 1: Aplicar** (name `caixa_fisico`)

```sql
-- semente do catador avulso (idempotente)
insert into public.people (nome, tipo)
select 'Avulso', 'fornecedor'
where not exists (select 1 from public.people where nome = 'Avulso' and tipo = 'fornecedor');

-- registrar_compra: agora aceita telefone do catador no cadastro rápido
drop function if exists public.registrar_compra(bigint, text, text, jsonb);
create or replace function public.registrar_compra(
  p_pessoa_id bigint,
  p_catador_nome text,
  p_catador_telefone text,
  p_observacoes text,
  p_itens jsonb
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_papel text;
  v_pessoa_id bigint := p_pessoa_id;
  v_compra_id bigint;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_item_id bigint;
  v_peso_liq numeric(10,3);
  v_preco numeric(12,2);
  v_subtotal numeric(12,2);
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid;
  if v_papel is null then raise exception 'usuário sem perfil'; end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'compra sem itens';
  end if;

  if v_pessoa_id is null then
    if coalesce(btrim(p_catador_nome), '') = '' then raise exception 'informe o catador'; end if;
    insert into public.people (nome, tipo, telefone)
    values (btrim(p_catador_nome), 'fornecedor', nullif(btrim(coalesce(p_catador_telefone,'')), ''))
    returning id into v_pessoa_id;
  end if;

  insert into public.purchases (pessoa_id, operador_id, total, forma_pagamento, status, observacoes)
  values (v_pessoa_id, v_uid, 0, 'dinheiro', 'pendente', nullif(btrim(coalesce(p_observacoes,'')), ''))
  returning id into v_compra_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_peso_liq := (v_item->>'peso_liquido')::numeric;
    v_preco := (v_item->>'preco_unitario')::numeric;
    v_subtotal := round(v_peso_liq * v_preco, 2);
    insert into public.purchase_items (purchase_id, material_id, peso_bruto, peso_liquido, preco_unitario, subtotal)
    values (v_compra_id, (v_item->>'material_id')::bigint, (v_item->>'peso_bruto')::numeric, v_peso_liq, v_preco, v_subtotal)
    returning id into v_item_id;
    insert into public.stock_movements (material_id, tipo, quantidade, purchase_item_id, motivo, created_by)
    values ((v_item->>'material_id')::bigint, 'entrada_compra', v_peso_liq, v_item_id, 'compra', v_uid);
    update public.materials set estoque_atual = estoque_atual + v_peso_liq where id = (v_item->>'material_id')::bigint;
    v_total := v_total + v_subtotal;
  end loop;
  update public.purchases set total = v_total where id = v_compra_id;
  return v_compra_id;
end; $$;
revoke execute on function public.registrar_compra(bigint, text, text, text, jsonb) from public, anon;
grant execute on function public.registrar_compra(bigint, text, text, text, jsonb) to authenticated;

-- CAIXA FÍSICO
create table public.cash_sessions (
  id bigint generated always as identity primary key,
  dia date not null unique,
  saldo_inicial numeric(12,2) not null default 0,
  saldo_contado numeric(12,2),
  status text not null default 'aberto' check (status in ('aberto','fechado')),
  observacoes text,
  aberto_por uuid references public.profiles(id),
  fechado_por uuid references public.profiles(id),
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger cash_sessions_set_updated before update on public.cash_sessions
  for each row execute function public.set_updated_at();

create table public.cash_movements (
  id bigint generated always as identity primary key,
  dia date not null,
  tipo text not null check (tipo in ('saque','despesa')),
  categoria text,
  descricao text,
  valor numeric(12,2) not null check (valor >= 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index cash_movements_dia_idx on public.cash_movements (dia);

alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;

-- só admin/escritório acessam o caixa (financeiro)
create policy cash_sessions_rw on public.cash_sessions for all to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));
create policy cash_movements_rw on public.cash_movements for all to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));
```

- [ ] **Step 2: Verificar** — `select id, nome from public.people where nome='Avulso';` (1 linha); tabelas `cash_sessions`/`cash_movements` existem. `get_advisors` security (WARN de SECURITY DEFINER em registrar_compra é intencional; sem RLS disabled).

- [ ] **Step 3: Versionar** SQL em `supabase/migrations/0005_caixa_fisico.sql`. Commit:
```bash
git add supabase/migrations/0005_caixa_fisico.sql
git commit -m "feat(db): caixa físico (cash_sessions/cash_movements), Avulso e registrar_compra c/ telefone"
```

---

## Task 2: Lógica do caixa (TDD)

**Files:** `src/lib/caixa-fisico.ts` (+ test)

- [ ] **Step 1: Teste** — `src/lib/caixa-fisico.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { calcularSaldoCaixa } from "@/lib/caixa-fisico";

describe("calcularSaldoCaixa", () => {
  it("inicial + saques - compras - despesas", () => {
    const r = calcularSaldoCaixa({
      saldoInicial: 1000, saques: [500], comprasDinheiro: [98.6, 9], despesas: [120, 30],
    });
    expect(r.totalSaques).toBe(500);
    expect(r.totalCompras).toBe(107.6);
    expect(r.totalDespesas).toBe(150);
    expect(r.saldoCalculado).toBe(1242.4);
  });
  it("diferenca = contado - calculado", () => {
    const r = calcularSaldoCaixa({
      saldoInicial: 0, saques: [], comprasDinheiro: [], despesas: [], contado: 95,
    });
    expect(r.saldoCalculado).toBe(0);
    expect(r.diferenca).toBe(95);
  });
});
```

- [ ] **Step 2: Rodar (FAIL).**

- [ ] **Step 3: Implementar `src/lib/caixa-fisico.ts`**
```ts
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const soma = (xs: number[]) => r2(xs.reduce((s, x) => s + x, 0));

export type EntradaCaixa = {
  saldoInicial: number;
  saques: number[];
  comprasDinheiro: number[];
  despesas: number[];
  contado?: number;
};
export type SaldoCaixa = {
  totalSaques: number;
  totalCompras: number;
  totalDespesas: number;
  saldoCalculado: number;
  diferenca: number | null;
};

export function calcularSaldoCaixa(e: EntradaCaixa): SaldoCaixa {
  const totalSaques = soma(e.saques);
  const totalCompras = soma(e.comprasDinheiro);
  const totalDespesas = soma(e.despesas);
  const saldoCalculado = r2(e.saldoInicial + totalSaques - totalCompras - totalDespesas);
  const diferenca = e.contado === undefined ? null : r2(e.contado - saldoCalculado);
  return { totalSaques, totalCompras, totalDespesas, saldoCalculado, diferenca };
}
```

- [ ] **Step 4: Rodar (PASS)** + suíte. Commit `git commit -am "feat: calcularSaldoCaixa (TDD)"`.

---

## Task 3: Balança — impureza % + catador (conhecido/novo/avulso)

**Files:** `src/app/(app)/balanca/TelaBalanca.tsx`, `actions.ts`, `page.tsx`

- [ ] **Step 1: Atualizar `actions.ts`** — payload com telefone:
```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  material_id: z.number().int().positive(),
  peso_bruto: z.number().positive(),
  peso_liquido: z.number().positive(),
  preco_unitario: z.number().min(0),
});
const compraSchema = z.object({
  pessoa_id: z.number().int().positive().nullable(),
  catador_nome: z.string().trim().default(""),
  catador_telefone: z.string().trim().default(""),
  observacoes: z.string().trim().default(""),
  itens: z.array(itemSchema).min(1, "Compra sem itens"),
});
export type ResultadoCompra = { ok: true; id: number } | { ok: false; erro: string };

export async function registrarCompra(payload: unknown): Promise<ResultadoCompra> {
  const parsed = compraSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { pessoa_id, catador_nome, catador_telefone, observacoes, itens } = parsed.data;
  if (pessoa_id === null && catador_nome === "") return { ok: false, erro: "Informe o catador" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_compra", {
    p_pessoa_id: pessoa_id,
    p_catador_nome: catador_nome,
    p_catador_telefone: catador_telefone,
    p_observacoes: observacoes,
    p_itens: itens,
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/balanca");
  revalidatePath("/escritorio/materiais");
  return { ok: true, id: data as number };
}
```

- [ ] **Step 2: Atualizar `page.tsx`** — passar id do Avulso e fornecedores (sem o Avulso na lista de conhecidos):
```tsx
import { createClient } from "@/lib/supabase/server";
import { TelaBalanca } from "./TelaBalanca";
import type { Material, Pessoa } from "@/lib/types";

export default async function BalancaPage() {
  const supabase = await createClient();
  const [{ data: materiais }, { data: pessoas }] = await Promise.all([
    supabase.from("materials").select("*").eq("ativo", true).order("nome"),
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
```

- [ ] **Step 3: Reescrever `TelaBalanca.tsx`** (impureza % + catador modos). Conteúdo completo:
```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { formatBRL, calcSubtotal } from "@/lib/format";
import { calcTotalCompra } from "@/lib/compra";
import { registrarCompra } from "./actions";
import type { Material, ItemCesta, Pessoa } from "@/lib/types";

type Props = {
  materiais: Material[];
  fornecedores: Pick<Pessoa, "id" | "nome">[];
  avulsoId: number | null;
};
type ModoCatador = "conhecido" | "novo" | "avulso";

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export function TelaBalanca({ materiais, fornecedores, avulsoId }: Props) {
  const [cesta, setCesta] = useState<ItemCesta[]>([]);
  const [sel, setSel] = useState<Material | null>(null);
  const [pesoStr, setPesoStr] = useState("0");
  const [pct, setPct] = useState(0); // % de impureza
  const [pctStr, setPctStr] = useState(""); // campo custom
  const [modo, setModo] = useState<ModoCatador>("conhecido");
  const [catadorId, setCatadorId] = useState<number | "">("");
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  const peso = parseFloat(pesoStr.replace(",", ".")) || 0;
  const liquido = r3(peso * (1 - pct / 100));
  const valorAtual = sel ? calcSubtotal(liquido, sel.preco_compra) : 0;
  const total = useMemo(() => calcTotalCompra(cesta), [cesta]);

  function abrir(m: Material) {
    setSel(m); setPesoStr("0"); setPct(0); setPctStr("");
  }
  function tecla(k: string) {
    setPesoStr((c) => (k === "back" ? (c.length > 1 ? c.slice(0, -1) : "0") : k === "," ? (c.includes(",") ? c : c + ",") : c === "0" ? k : c + k));
  }
  function escolherPct(p: number) { setPct(p); setPctStr(""); }
  function pctCustom(v: string) {
    setPctStr(v);
    const n = parseFloat(v.replace(",", "."));
    setPct(Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0);
  }
  function adicionar() {
    if (!sel || liquido <= 0) { setMsg("Digite o peso"); return; }
    setCesta((c) => [...c, {
      material_id: sel.id, nome: sel.nome, emoji: sel.emoji, unidade: sel.unidade,
      preco_unitario: sel.preco_compra, peso_bruto: peso, peso_liquido: liquido,
      subtotal: calcSubtotal(liquido, sel.preco_compra),
    }]);
    setSel(null); setMsg("");
  }
  function remover(i: number) { setCesta((c) => c.filter((_, idx) => idx !== i)); }

  function resolverCatador(): { pessoa_id: number | null; nome: string; tel: string } | null {
    if (modo === "avulso") {
      if (avulsoId) return { pessoa_id: avulsoId, nome: "", tel: "" };
      return { pessoa_id: null, nome: "Avulso", tel: "" };
    }
    if (modo === "novo") {
      if (novoNome.trim() === "") return null;
      return { pessoa_id: null, nome: novoNome.trim(), tel: novoTel.trim() };
    }
    if (catadorId === "") return null;
    return { pessoa_id: Number(catadorId), nome: "", tel: "" };
  }

  function finalizar() {
    if (cesta.length === 0) return;
    const cat = resolverCatador();
    if (!cat) { setMsg("Escolha ou cadastre o catador"); return; }
    startTransition(async () => {
      const res = await registrarCompra({
        pessoa_id: cat.pessoa_id, catador_nome: cat.nome, catador_telefone: cat.tel,
        observacoes: "",
        itens: cesta.map((i) => ({ material_id: i.material_id, peso_bruto: i.peso_bruto, peso_liquido: i.peso_liquido, preco_unitario: i.preco_unitario })),
      });
      if (res.ok) {
        setMsg(`✅ Compra salva — ${formatBRL(total)}`);
        setCesta([]); setNovoNome(""); setNovoTel(""); setCatadorId("");
      } else setMsg("Erro: " + res.erro);
    });
  }

  const btn = "rounded-xl text-xl font-extrabold active:scale-95 transition-transform";
  const tab = (on: boolean) => "rounded-full px-4 py-2 text-sm font-bold " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-600");
  const pctBtn = (on: boolean) => "rounded-xl px-4 py-3 text-lg font-extrabold " + (on ? "bg-marca-teal text-white" : "bg-slate-100 text-slate-700");

  return (
    <div className="space-y-4">
      {/* catador */}
      <div className="rounded-2xl border bg-white p-3">
        <div className="mb-2 flex gap-2">
          <button onClick={() => setModo("conhecido")} className={tab(modo === "conhecido")}>Cadastrado</button>
          <button onClick={() => setModo("novo")} className={tab(modo === "novo")}>Cadastro rápido</button>
          <button onClick={() => setModo("avulso")} className={tab(modo === "avulso")}>Avulso</button>
        </div>
        {modo === "conhecido" ? (
          <select value={catadorId} onChange={(e) => setCatadorId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-xl border p-3 text-base">
            <option value="">Selecione o catador…</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        ) : modo === "novo" ? (
          <div className="flex flex-wrap gap-2">
            <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do catador"
              className="min-w-[12rem] flex-1 rounded-xl border p-3 text-base" />
            <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="Telefone (opcional)"
              className="min-w-[10rem] flex-1 rounded-xl border p-3 text-base" />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Compra avulsa (catador não cadastrado).</p>
        )}
      </div>

      {/* grade */}
      <div>
        <div className="mb-2 text-lg font-extrabold">1) Toque no material</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {materiais.map((m) => (
            <button key={m.id} onClick={() => abrir(m)}
              className={`${btn} flex min-h-[110px] flex-col items-center justify-center gap-1 border-2 bg-white p-3 shadow-sm`}>
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-lg">{m.nome}</span>
              <span className="text-sm font-bold text-marca-teal-dark">{formatBRL(m.preco_compra)}/{m.unidade}</span>
            </button>
          ))}
        </div>
      </div>

      {/* cesta */}
      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold">Itens desta compra</div>
        {cesta.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhum item ainda.</div>
        ) : cesta.map((it, i) => (
          <div key={i} className="flex items-center gap-3 border-b p-3 last:border-0">
            <span className="text-2xl">{it.emoji}</span>
            <div className="flex-1">
              <div className="font-bold">{it.nome}</div>
              <div className="text-sm text-slate-500">
                {it.peso_liquido.toLocaleString("pt-BR")} {it.unidade} × {formatBRL(it.preco_unitario)}
                {it.peso_liquido !== it.peso_bruto ? ` (bruto ${it.peso_bruto.toLocaleString("pt-BR")})` : ""}
              </div>
            </div>
            <span className="font-extrabold">{formatBRL(it.subtotal)}</span>
            <button onClick={() => remover(i)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600">🗑️</button>
          </div>
        ))}
        <div className="flex items-center justify-between p-4 text-2xl font-black">
          <span>TOTAL</span><span className="text-marca-teal-dark">{formatBRL(total)}</span>
        </div>
        <button onClick={finalizar} disabled={cesta.length === 0 || pending}
          className="w-full rounded-b-2xl bg-marca-green p-5 text-2xl font-black text-white disabled:bg-slate-300">
          {pending ? "Salvando..." : `💵 FINALIZAR E PAGAR ${cesta.length ? "(" + formatBRL(total) + ")" : ""}`}
        </button>
      </div>

      {msg ? <p className="text-center text-lg font-bold">{msg}</p> : null}

      {/* teclado */}
      {sel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-t-3xl bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl">{sel.emoji}</span>
              <span className="text-2xl font-black">{sel.nome}</span>
              <span className="ml-auto font-bold text-marca-teal-dark">{formatBRL(sel.preco_compra)}/{sel.unidade}</span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-xs font-bold uppercase text-slate-500">Peso bruto ({sel.unidade})</div>
                <div className="text-4xl font-black">{pesoStr}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-xs font-bold uppercase text-slate-500">Valor (líq. {liquido.toLocaleString("pt-BR")})</div>
                <div className="text-4xl font-black text-marca-teal-dark">{formatBRL(valorAtual)}</div>
              </div>
            </div>
            {/* impureza % */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-600">Impureza:</span>
              <button onClick={() => escolherPct(0)} className={pctBtn(pct === 0 && pctStr === "")}>0%</button>
              <button onClick={() => escolherPct(5)} className={pctBtn(pct === 5 && pctStr === "")}>5%</button>
              <button onClick={() => escolherPct(10)} className={pctBtn(pct === 10 && pctStr === "")}>10%</button>
              <input inputMode="decimal" value={pctStr} onChange={(e) => pctCustom(e.target.value)}
                placeholder="outro %" className="w-24 rounded-lg border p-2 text-center text-lg" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["7","8","9","4","5","6","1","2","3",",","0","back"].map((k) => (
                <button key={k} onClick={() => tecla(k)} className={`${btn} bg-slate-100 p-4 text-2xl ${k === "back" ? "text-red-600" : ""}`}>
                  {k === "back" ? "⌫" : k}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => setSel(null)} className={`${btn} bg-slate-200 p-4 text-lg`}>Cancelar</button>
              <button onClick={adicionar} className={`${btn} col-span-2 bg-marca-green p-4 text-xl text-white`}>✅ Adicionar item</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Build + commit** (`npm run build`; `git commit -am "feat(balança): impureza por % e catador (cadastrado/rápido/avulso)"`)

---

## Task 4: Caixa físico — actions

**Files:** `src/app/(app)/escritorio/caixa/actions.ts`

- [ ] **Step 1: Implementar**
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function db() { return createClient(); }

/** Abre a sessão do dia (se não existir). saldo_inicial = saldo_contado do último dia fechado. */
export async function abrirCaixa(formData: FormData) {
  const dia = String(formData.get("dia"));
  const supabase = await db();
  const { data: existe } = await supabase.from("cash_sessions").select("id").eq("dia", dia).maybeSingle();
  if (existe) { revalidatePath("/escritorio/caixa"); return; }
  const { data: ult } = await supabase.from("cash_sessions")
    .select("saldo_contado").eq("status", "fechado").lt("dia", dia)
    .order("dia", { ascending: false }).limit(1).maybeSingle();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("cash_sessions").insert({
    dia, saldo_inicial: ult?.saldo_contado ?? 0, status: "aberto", aberto_por: user?.id,
  });
  revalidatePath("/escritorio/caixa");
}

export async function lancarMovimento(formData: FormData) {
  const dia = String(formData.get("dia"));
  const tipo = String(formData.get("tipo")); // saque | despesa
  const categoria = String(formData.get("categoria") ?? "");
  const descricao = String(formData.get("descricao") ?? "");
  const valor = Number(String(formData.get("valor")).replace(",", "."));
  if (!(valor > 0)) return;
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("cash_movements").insert({
    dia, tipo, categoria: categoria || null, descricao: descricao || null, valor, created_by: user?.id,
  });
  revalidatePath("/escritorio/caixa");
}

export async function removerMovimento(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await db();
  await supabase.from("cash_movements").delete().eq("id", id);
  revalidatePath("/escritorio/caixa");
}

export async function fecharCaixa(formData: FormData) {
  const dia = String(formData.get("dia"));
  const contado = Number(String(formData.get("contado")).replace(",", "."));
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("cash_sessions")
    .update({ saldo_contado: contado, status: "fechado", fechado_por: user?.id, fechado_em: new Date().toISOString() })
    .eq("dia", dia);
  revalidatePath("/escritorio/caixa");
}
```

- [ ] **Step 2: Build + commit** (`git commit -am "feat: actions do caixa físico (abrir/lançar/remover/fechar)"`)

---

## Task 5: Caixa físico — página

**Files:** Reescrever `src/app/(app)/escritorio/caixa/page.tsx` + criar `src/app/(app)/escritorio/caixa/FormsCaixa.tsx`

- [ ] **Step 1: `FormsCaixa.tsx`** (forms client: saque, despesa, fechar)
```tsx
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
      <select name="categoria" className={inp}>
        <option>Combustível</option>
        <option>Segurança</option>
        <option>Alimentação / Café</option>
        <option>Manutenção / Pedágio</option>
        <option>Outros</option>
      </select>
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
```

- [ ] **Step 2: `page.tsx`**
```tsx
import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { calcularSaldoCaixa } from "@/lib/caixa-fisico";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoAbrir, FormSaque, FormDespesa, FormFechar } from "./FormsCaixa";
import { removerMovimento } from "./actions";

export default async function CaixaPage({ searchParams }: { searchParams: { dia?: string } }) {
  const dia = searchParams.dia ?? hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();

  const [{ data: sessao }, { data: movs }, { data: compras }] = await Promise.all([
    supabase.from("cash_sessions").select("*").eq("dia", dia).maybeSingle(),
    supabase.from("cash_movements").select("*").eq("dia", dia).order("created_at"),
    supabase.from("purchases").select("total, status").eq("forma_pagamento", "dinheiro").gte("data_hora", inicio).lt("data_hora", fim),
  ]);

  const movimentos = (movs as any[]) ?? [];
  const saques = movimentos.filter((m) => m.tipo === "saque");
  const despesas = movimentos.filter((m) => m.tipo === "despesa");
  const comprasDin = ((compras as any[]) ?? []).filter((c) => c.status !== "cancelada");

  const r = calcularSaldoCaixa({
    saldoInicial: sessao?.saldo_inicial ?? 0,
    saques: saques.map((m) => Number(m.valor)),
    comprasDinheiro: comprasDin.map((c) => Number(c.total)),
    despesas: despesas.map((m) => Number(m.valor)),
    contado: sessao?.saldo_contado ?? undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Caixa do dia</h1>
        <form><input type="date" name="dia" defaultValue={dia} className="rounded-xl border p-2" /></form>
      </div>

      {!sessao ? (
        <div className="rounded-2xl border bg-white p-6 text-center">
          <p className="mb-3 text-slate-500">O caixa de {new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR")} ainda não foi aberto.</p>
          <BotaoAbrir dia={dia} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <CardResumo titulo="Saldo inicial" valor={formatBRL(sessao.saldo_inicial)} cor="navy" />
            <CardResumo titulo="Saques (entrada)" valor={formatBRL(r.totalSaques)} cor="green" />
            <CardResumo titulo="Saídas (compras+despesas)" valor={formatBRL(r.totalCompras + r.totalDespesas)} cor="gold" />
            <CardResumo titulo="Saldo calculado" valor={formatBRL(r.saldoCalculado)} cor="teal" />
          </div>

          {sessao.status === "fechado" ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-bold text-marca-navy">Caixa fechado</div>
              <div className="text-sm">Contado: <b>{formatBRL(sessao.saldo_contado)}</b> · Diferença:{" "}
                <b className={(r.diferenca ?? 0) === 0 ? "text-marca-green-dark" : "text-red-600"}>
                  {formatBRL(r.diferenca ?? 0)} {(r.diferenca ?? 0) > 0 ? "(sobra)" : (r.diferenca ?? 0) < 0 ? "(falta)" : ""}
                </b>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border bg-white p-4">
              <FormSaque dia={dia} />
              <FormDespesa dia={dia} />
              <div className="border-t pt-3"><FormFechar dia={dia} /></div>
            </div>
          )}

          {/* compras em dinheiro (auto) */}
          <div className="rounded-2xl border bg-white">
            <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Compras em dinheiro (automático) — {formatBRL(r.totalCompras)}</div>
            {comprasDin.length === 0 ? <div className="p-4 text-center text-slate-400">Nenhuma.</div> :
              <div className="p-3 text-sm text-slate-600">{comprasDin.length} compra(s) somando {formatBRL(r.totalCompras)}</div>}
          </div>

          {/* lançamentos manuais */}
          <div className="rounded-2xl border bg-white">
            <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Lançamentos do dia</div>
            {movimentos.length === 0 ? <div className="p-4 text-center text-slate-400">Nenhum saque/despesa.</div> :
              movimentos.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border-b p-3 last:border-0">
                  <span className={"rounded-full px-2 py-0.5 text-xs font-bold " + (m.tipo === "saque" ? "bg-marca-green-dark/10 text-marca-green-dark" : "bg-marca-gold-light text-marca-gold")}>
                    {m.tipo === "saque" ? "Saque" : m.categoria ?? "Despesa"}
                  </span>
                  <span className="text-slate-600">{m.descricao}</span>
                  <span className={"ml-auto font-bold " + (m.tipo === "saque" ? "text-marca-green-dark" : "text-red-600")}>
                    {m.tipo === "saque" ? "+" : "−"}{formatBRL(Number(m.valor))}
                  </span>
                  {sessao.status !== "fechado" ? (
                    <BotaoConfirmar acao={removerMovimento} hidden={{ id: m.id }} mensagem="Remover este lançamento?" className="text-slate-400">🗑️</BotaoConfirmar>
                  ) : null}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build + suíte + commit** (`git commit -am "feat: caixa físico (abertura, saques, despesas, fechamento e conferência)"`)

---

## Task 6: Verificação E2E

- [ ] **Step 1:** `npm run dev`. **Balança** (admin): tocar material → impureza **10%** → valor cai; **5%**; **custom 7%**; catador **Cadastro rápido** (nome+tel) → finalizar; depois **Avulso** → finalizar; **Cadastrado** (select) → finalizar.
- [ ] **Step 2:** **Caixa** (escritório): abrir o caixa do dia (saldo inicial 0); lançar **Saque** R$ 1.000; **Despesa** Combustível "caminhão branco" R$ 150; ver saldo calculado = 1000 − compras(dinheiro do dia) − 150; **Fechar** com contado → ver diferença (sobra/falta). Conferir que `balanca` (perfil) **não** acessa /escritorio/caixa.
- [ ] **Step 3:** Limpar dados de teste (compras, cash_sessions, cash_movements do dia; estornar estoque das compras de teste).

---

## Verificação final

- [ ] `npx vitest run` verde; `npm run build` ok.
- [ ] Impureza por % (botões + custom) reflete no valor e no peso líquido salvo.
- [ ] Catador: cadastrado / rápido (com telefone) / avulso.
- [ ] Caixa: saldo_inicial puxa do contado do dia anterior; saques somam; compras-dinheiro e despesas subtraem; fechamento registra diferença; balança sem acesso ao caixa.
