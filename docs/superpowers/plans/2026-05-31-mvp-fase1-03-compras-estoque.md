# Plano 3 — Compras + Estoque (MVP Sucata)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar tarefa a tarefa. Passos usam checkbox `- [ ]`.

**Goal:** Tela da balança (touch, clicável) que registra compras com vários itens, desconto manual de impureza, catador obrigatório e pagamento em dinheiro — atualizando o estoque de forma transacional.

**Architecture:** Tabelas `purchases`, `purchase_items`, `stock_movements`. Uma função Postgres `public.registrar_compra` (SECURITY DEFINER, com checagem interna de `auth.uid()`) faz tudo numa transação: cria a compra, os itens, os movimentos de estoque, atualiza `materials.estoque_atual` e resolve o catador (usa `pessoa_id` ou cria fornecedor a partir do nome). O front-end é um Client Component com estado da cesta que chama uma Server Action, que por sua vez chama a função via `supabase.rpc`.

**Tech Stack:** Next.js 14, TS, Tailwind, @supabase/ssr, Zod, Vitest.

**Base existente (Planos 1-2):** auth + RLS + `private.user_role()`; `materials` e `people` com RLS; `@/lib/format` (`formatBRL`, `calcSubtotal`); `@/lib/supabase/server`; `@/lib/types` (`Material`); componentes `Campo`. Projeto Supabase: `zwgexgghhbtjmkxiqxis`.

---

## Estrutura de arquivos (criados neste plano)

- Migration Supabase + `supabase/migrations/0003_compras_estoque.sql`
- `src/lib/types.ts` — adicionar tipos `ItemCesta`, `Compra`
- `src/lib/compra.ts` (+ test) — `calcTotalCompra` (lógica pura, TDD)
- `src/app/(app)/balanca/actions.ts` — server action `registrarCompra`
- `src/app/(app)/balanca/TelaBalanca.tsx` — Client Component (grade, teclado, impureza, catador, cesta)
- `src/app/(app)/balanca/page.tsx` — busca materiais ativos + fornecedores, renderiza a tela

---

## Task 1: Migration — purchases, purchase_items, stock_movements + função transacional

**Files:** Supabase (MCP `apply_migration`, project_id `zwgexgghhbtjmkxiqxis`) + `supabase/migrations/0003_compras_estoque.sql`

- [ ] **Step 1: Aplicar a migration** (name `compras_estoque`)

```sql
-- COMPRAS (cabeçalho)
create table public.purchases (
  id bigint generated always as identity primary key,
  pessoa_id bigint not null references public.people(id),
  operador_id uuid not null references public.profiles(id),
  data_hora timestamptz not null default now(),
  total numeric(12,2) not null default 0,
  forma_pagamento text not null default 'dinheiro'
    check (forma_pagamento in ('dinheiro','pix','transferencia','prazo')),
  status text not null default 'pendente'
    check (status in ('pendente','conferida','cancelada')),
  conferida_por uuid references public.profiles(id),
  conferida_em timestamptz,
  motivo_cancelamento text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger purchases_set_updated before update on public.purchases
  for each row execute function public.set_updated_at();
create index purchases_pessoa_idx on public.purchases (pessoa_id);
create index purchases_data_idx on public.purchases (data_hora);
create index purchases_status_idx on public.purchases (status);

-- ITENS DA COMPRA
create table public.purchase_items (
  id bigint generated always as identity primary key,
  purchase_id bigint not null references public.purchases(id) on delete cascade,
  material_id bigint not null references public.materials(id),
  peso_bruto numeric(10,3) not null,
  peso_liquido numeric(10,3) not null,
  preco_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);
create index purchase_items_material_idx on public.purchase_items (material_id);

-- MOVIMENTOS DE ESTOQUE (log)
create table public.stock_movements (
  id bigint generated always as identity primary key,
  material_id bigint not null references public.materials(id),
  tipo text not null check (tipo in ('entrada_compra','ajuste','estorno')),
  quantidade numeric(12,3) not null,
  purchase_item_id bigint references public.purchase_items(id),
  motivo text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index stock_movements_material_idx on public.stock_movements (material_id);
create index stock_movements_item_idx on public.stock_movements (purchase_item_id);

-- RLS: leitura para logados; escrita feita pela função SECURITY DEFINER
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.stock_movements enable row level security;

create policy purchases_read on public.purchases for select to authenticated using (true);
create policy purchase_items_read on public.purchase_items for select to authenticated using (true);
create policy stock_movements_read on public.stock_movements for select to authenticated using (true);

-- escritório/admin podem editar/cancelar compras (conferência, Plano 4)
create policy purchases_update on public.purchases for update to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));

-- FUNÇÃO TRANSACIONAL
-- SECURITY DEFINER: faz inserts/updates controlados (balança não tem escrita direta nessas tabelas).
-- Checagem interna de auth.uid() + perfil. Exposta em public para chamada via supabase.rpc.
create or replace function public.registrar_compra(
  p_pessoa_id bigint,
  p_catador_nome text,
  p_observacoes text,
  p_itens jsonb
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
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

  -- catador obrigatório: usa o id informado ou cria um fornecedor pelo nome
  if v_pessoa_id is null then
    if coalesce(btrim(p_catador_nome), '') = '' then
      raise exception 'informe o catador';
    end if;
    insert into public.people (nome, tipo) values (btrim(p_catador_nome), 'fornecedor')
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

    insert into public.purchase_items
      (purchase_id, material_id, peso_bruto, peso_liquido, preco_unitario, subtotal)
    values
      (v_compra_id, (v_item->>'material_id')::bigint,
       (v_item->>'peso_bruto')::numeric, v_peso_liq, v_preco, v_subtotal)
    returning id into v_item_id;

    insert into public.stock_movements
      (material_id, tipo, quantidade, purchase_item_id, motivo, created_by)
    values
      ((v_item->>'material_id')::bigint, 'entrada_compra', v_peso_liq, v_item_id, 'compra', v_uid);

    update public.materials set estoque_atual = estoque_atual + v_peso_liq
      where id = (v_item->>'material_id')::bigint;

    v_total := v_total + v_subtotal;
  end loop;

  update public.purchases set total = v_total where id = v_compra_id;
  return v_compra_id;
end;
$$;

revoke execute on function public.registrar_compra(bigint, text, text, jsonb) from public, anon;
grant execute on function public.registrar_compra(bigint, text, text, jsonb) to authenticated;
```

NOTA de segurança: `registrar_compra` é `SECURITY DEFINER` em `public` (necessário para `supabase.rpc` e para a balança escrever sem permissão direta). O advisor vai marcar "authenticated can execute SECURITY DEFINER" — é **intencional** (há checagem de `auth.uid()` + perfil dentro). Documentar, não "corrigir".

- [ ] **Step 2: Verificar** (MCP `execute_sql`): conferir que as 3 tabelas existem:
`select table_name from information_schema.tables where table_schema='public' and table_name in ('purchases','purchase_items','stock_movements') order by 1;` → 3 linhas.

- [ ] **Step 3: Teste rápido da função** (MCP `execute_sql`) — simula como o usuário admin. Como `auth.uid()` é null no SQL editor, este teste valida só a existência/erro de "não autenticado":
`select public.registrar_compra(null, 'Teste', null, '[]'::jsonb);` → deve dar erro `não autenticado` (esperado; a chamada real vem do app com sessão). Não versione dados de teste.

- [ ] **Step 4: Advisors** (`get_advisors` security): aceitar o WARN de SECURITY DEFINER em `registrar_compra` (intencional). Garantir que não há "RLS disabled" nas 3 tabelas novas.

- [ ] **Step 5: Versionar** — criar `supabase/migrations/0003_compras_estoque.sql` com o SQL do Step 1 (com cabeçalho de comentário). Commit:
```bash
git add supabase/migrations/0003_compras_estoque.sql
git commit -m "feat(db): compras, itens, movimentos de estoque + função transacional registrar_compra"
```

---

## Task 2: Tipos + cálculo da compra (TDD)

**Files:** Modificar `src/lib/types.ts`; criar `src/lib/compra.ts` + `src/lib/compra.test.ts`.

- [ ] **Step 1: Adicionar tipos em `src/lib/types.ts`** (no fim do arquivo)

```ts
export type ItemCesta = {
  material_id: number;
  nome: string;
  emoji: string | null;
  unidade: Unidade;
  preco_unitario: number;
  peso_bruto: number;
  peso_liquido: number;
  subtotal: number;
};
```

- [ ] **Step 2: Teste de `calcTotalCompra` (falha primeiro)**

Create `src/lib/compra.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { calcTotalCompra } from "@/lib/compra";
import type { ItemCesta } from "@/lib/types";

function item(p: Partial<ItemCesta>): ItemCesta {
  return {
    material_id: 1, nome: "X", emoji: null, unidade: "kg",
    preco_unitario: 0, peso_bruto: 0, peso_liquido: 0, subtotal: 0, ...p,
  };
}

describe("calcTotalCompra", () => {
  it("soma os subtotais com 2 casas", () => {
    const itens = [item({ subtotal: 68.2 }), item({ subtotal: 32 }), item({ subtotal: 0.01 })];
    expect(calcTotalCompra(itens)).toBe(100.21);
  });
  it("cesta vazia => 0", () => {
    expect(calcTotalCompra([])).toBe(0);
  });
});
```

- [ ] **Step 3: Rodar (FAIL)** — `npx vitest run src/lib/compra.test.ts`.

- [ ] **Step 4: Implementar `src/lib/compra.ts`**

```ts
import type { ItemCesta } from "@/lib/types";

/** Soma os subtotais da cesta, arredondando o total para 2 casas. */
export function calcTotalCompra(itens: ItemCesta[]): number {
  const total = itens.reduce((s, i) => s + i.subtotal, 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}
```

- [ ] **Step 5: Rodar (PASS)** + suíte completa `npx vitest run`. Commit:
```bash
git add -A
git commit -m "feat: tipo ItemCesta e calcTotalCompra (TDD)"
```

---

## Task 3: Server Action registrarCompra

**Files:** Create `src/app/(app)/balanca/actions.ts`

- [ ] **Step 1: Implementar**

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
  observacoes: z.string().trim().default(""),
  itens: z.array(itemSchema).min(1, "Compra sem itens"),
});

export type ResultadoCompra = { ok: true; id: number } | { ok: false; erro: string };

export async function registrarCompra(payload: unknown): Promise<ResultadoCompra> {
  const parsed = compraSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { pessoa_id, catador_nome, observacoes, itens } = parsed.data;

  if (pessoa_id === null && catador_nome === "") {
    return { ok: false, erro: "Informe o catador" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_compra", {
    p_pessoa_id: pessoa_id,
    p_catador_nome: catador_nome,
    p_observacoes: observacoes,
    p_itens: itens,
  });

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/balanca");
  revalidatePath("/escritorio/materiais");
  return { ok: true, id: data as number };
}
```

- [ ] **Step 2: Build** (`npm run build`) — confirmar que compila. Commit:
```bash
git add -A
git commit -m "feat: server action registrarCompra (chama RPC transacional)"
```

---

## Task 4: Componente TelaBalanca (Client)

**Files:** Create `src/app/(app)/balanca/TelaBalanca.tsx`

- [ ] **Step 1: Implementar o componente**

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { formatBRL, calcSubtotal } from "@/lib/format";
import { calcTotalCompra } from "@/lib/compra";
import { registrarCompra } from "./actions";
import type { Material, ItemCesta, Pessoa } from "@/lib/types";

type Props = { materiais: Material[]; fornecedores: Pick<Pessoa, "id" | "nome">[] };

export function TelaBalanca({ materiais, fornecedores }: Props) {
  const [cesta, setCesta] = useState<ItemCesta[]>([]);
  const [sel, setSel] = useState<Material | null>(null);
  const [pesoStr, setPesoStr] = useState("0");
  const [liqStr, setLiqStr] = useState<string | null>(null); // peso líquido ajustado (impureza)
  const [catador, setCatador] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  const peso = parseFloat(pesoStr.replace(",", ".")) || 0;
  const liquido = liqStr === null ? peso : parseFloat(liqStr.replace(",", ".")) || 0;
  const valorAtual = sel ? calcSubtotal(liquido, sel.preco_compra) : 0;
  const total = useMemo(() => calcTotalCompra(cesta), [cesta]);

  function abrir(m: Material) {
    setSel(m);
    setPesoStr("0");
    setLiqStr(null);
  }
  function tecla(k: string) {
    setPesoStr((cur) => {
      if (k === "back") return cur.length > 1 ? cur.slice(0, -1) : "0";
      if (k === ",") return cur.includes(",") ? cur : cur + ",";
      return cur === "0" ? k : cur + k;
    });
    setLiqStr(null); // ao mexer no bruto, reseta o ajuste
  }
  function adicionar() {
    if (!sel || liquido <= 0) {
      setMsg("Digite o peso");
      return;
    }
    const it: ItemCesta = {
      material_id: sel.id, nome: sel.nome, emoji: sel.emoji, unidade: sel.unidade,
      preco_unitario: sel.preco_compra, peso_bruto: peso, peso_liquido: liquido,
      subtotal: calcSubtotal(liquido, sel.preco_compra),
    };
    setCesta((c) => [...c, it]);
    setSel(null);
    setMsg("");
  }
  function remover(i: number) {
    setCesta((c) => c.filter((_, idx) => idx !== i));
  }
  function finalizar() {
    if (cesta.length === 0) return;
    if (catador.trim() === "") {
      setMsg("Informe o catador antes de finalizar");
      return;
    }
    const conhecido = fornecedores.find(
      (f) => f.nome.toLowerCase() === catador.trim().toLowerCase(),
    );
    startTransition(async () => {
      const res = await registrarCompra({
        pessoa_id: conhecido ? conhecido.id : null,
        catador_nome: conhecido ? "" : catador.trim(),
        observacoes: "",
        itens: cesta.map((i) => ({
          material_id: i.material_id, peso_bruto: i.peso_bruto,
          peso_liquido: i.peso_liquido, preco_unitario: i.preco_unitario,
        })),
      });
      if (res.ok) {
        setMsg(`✅ Compra salva — ${catador.trim()} — ${formatBRL(total)}`);
        setCesta([]);
        setCatador("");
      } else {
        setMsg("Erro: " + res.erro);
      }
    });
  }

  const btn = "rounded-xl text-xl font-extrabold active:scale-95 transition-transform";

  return (
    <div className="space-y-4">
      {/* catador */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-slate-700">Catador:</span>
        <input
          list="fornecedores"
          value={catador}
          onChange={(e) => setCatador(e.target.value)}
          placeholder="Nome do catador"
          className="min-w-[14rem] flex-1 rounded-xl border p-3 text-base"
        />
        <datalist id="fornecedores">
          {fornecedores.map((f) => (
            <option key={f.id} value={f.nome} />
          ))}
        </datalist>
      </div>

      {/* grade de materiais */}
      <div>
        <div className="mb-2 text-lg font-extrabold">1) Toque no material</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {materiais.map((m) => (
            <button
              key={m.id}
              onClick={() => abrir(m)}
              className={`${btn} flex min-h-[110px] flex-col items-center justify-center gap-1 border-2 bg-white p-3 shadow-sm`}
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-lg">{m.nome}</span>
              <span className="text-sm font-bold text-green-700">
                {formatBRL(m.preco_compra)}/{m.unidade}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* cesta */}
      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold">Itens desta compra</div>
        {cesta.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhum item ainda.</div>
        ) : (
          cesta.map((it, i) => (
            <div key={i} className="flex items-center gap-3 border-b p-3 last:border-0">
              <span className="text-2xl">{it.emoji}</span>
              <div className="flex-1">
                <div className="font-bold">{it.nome}</div>
                <div className="text-sm text-slate-500">
                  {it.peso_liquido.toLocaleString("pt-BR")} {it.unidade} × {formatBRL(it.preco_unitario)}
                  {it.peso_liquido !== it.peso_bruto
                    ? ` (bruto ${it.peso_bruto.toLocaleString("pt-BR")})`
                    : ""}
                </div>
              </div>
              <span className="font-extrabold">{formatBRL(it.subtotal)}</span>
              <button onClick={() => remover(i)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600">
                🗑️
              </button>
            </div>
          ))
        )}
        <div className="flex items-center justify-between p-4 text-2xl font-black">
          <span>TOTAL</span>
          <span className="text-green-700">{formatBRL(total)}</span>
        </div>
        <button
          onClick={finalizar}
          disabled={cesta.length === 0 || pending}
          className="w-full rounded-b-2xl bg-green-600 p-5 text-2xl font-black text-white disabled:bg-slate-300"
        >
          {pending ? "Salvando..." : `💵 FINALIZAR E PAGAR ${cesta.length ? "(" + formatBRL(total) + ")" : ""}`}
        </button>
      </div>

      {msg ? <p className="text-center text-lg font-bold">{msg}</p> : null}

      {/* teclado (modal) */}
      {sel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-t-3xl bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl">{sel.emoji}</span>
              <span className="text-2xl font-black">{sel.nome}</span>
              <span className="ml-auto font-bold text-green-700">
                {formatBRL(sel.preco_compra)}/{sel.unidade}
              </span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-xs font-bold uppercase text-slate-500">Peso ({sel.unidade})</div>
                <div className="text-4xl font-black">{pesoStr}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-xs font-bold uppercase text-slate-500">Valor</div>
                <div className="text-4xl font-black text-green-700">{formatBRL(valorAtual)}</div>
              </div>
            </div>
            {/* ajuste manual de impureza */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">Peso líquido (impureza):</span>
              <input
                inputMode="decimal"
                value={liqStr ?? String(peso).replace(".", ",")}
                onChange={(e) => setLiqStr(e.target.value)}
                className="w-28 rounded-lg border p-2 text-center text-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", ",", "0", "back"].map((k) => (
                <button
                  key={k}
                  onClick={() => tecla(k)}
                  className={`${btn} bg-slate-100 p-4 text-2xl ${k === "back" ? "text-red-600" : ""}`}
                >
                  {k === "back" ? "⌫" : k}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => setSel(null)} className={`${btn} bg-slate-200 p-4 text-lg`}>
                Cancelar
              </button>
              <button onClick={adicionar} className={`${btn} col-span-2 bg-green-600 p-4 text-xl text-white`}>
                ✅ Adicionar item
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Build** (`npm run build`) — confirmar compilação. Commit:
```bash
git add -A
git commit -m "feat: TelaBalanca (grade, teclado, impureza, cesta, finalizar)"
```

---

## Task 5: Página da balança com dados reais

**Files:** Modificar `src/app/(app)/balanca/page.tsx`

- [ ] **Step 1: Substituir o placeholder**

```tsx
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
```

- [ ] **Step 2: Build + suíte**

Run `npm run build` (rota `/balanca` Dynamic ƒ) e `npx vitest run` (verde). Commit:
```bash
git add -A
git commit -m "feat: página da balança usando materiais e fornecedores reais"
```

---

## Task 6: Verificação E2E + estoque

**Files:** nenhum (verificação)

- [ ] **Step 1: Subir e testar** — `npm run dev`. Logar como `balanca@sucata.local`/`sucata123`:
1. Em `/balanca`: tocar em **Alumínio** → teclado → digitar `12,4` → valor calcula → **Adicionar item**.
2. Tocar em **Papelão** → `40` → ajustar **peso líquido** para `38` (impureza) → valor recalcula → Adicionar.
3. Conferir total na cesta.
4. Digitar catador "Seu Zé" (datalist sugere os existentes) → **Finalizar e Pagar** → mensagem de sucesso, cesta limpa.
5. Tentar finalizar sem catador → mensagem "Informe o catador".

- [ ] **Step 2: Conferir estoque (MCP `execute_sql`)** — `select nome, estoque_atual from public.materials where nome in ('Alumínio','Papelão');` → Alumínio +12.4, Papelão +38. E `select count(*) from public.stock_movements;` aumentou. `select total from public.purchases order by id desc limit 1;` bate com a soma.

- [ ] **Step 3: Limpeza dos dados de teste** (MCP `execute_sql`) — apagar a compra de teste e estornar o estoque:
```sql
-- estorna estoque dos itens da última compra de teste e remove os registros
with ult as (select id from public.purchases order by id desc limit 1)
update public.materials m set estoque_atual = estoque_atual - pi.peso_liquido
  from public.purchase_items pi where pi.purchase_id = (select id from ult) and pi.material_id = m.id;
delete from public.stock_movements where purchase_item_id in
  (select id from public.purchase_items where purchase_id = (select id from public.purchases order by id desc limit 1));
delete from public.purchases where id = (select id from public.purchases order by id desc limit 1);
-- remover catador criado no teste, se órfão
delete from public.people p where p.nome = 'Seu Zé' = false and not exists
  (select 1 from public.purchases where pessoa_id = p.id) and p.created_at > now() - interval '1 hour';
```
(Ajuste conforme necessário; o objetivo é deixar seeds limpos.)

- [ ] **Step 4: Commit final** (se houver ajuste) e relatório.

---

## Verificação final do Plano 3

- [ ] `npx vitest run` verde; `npm run build` sem erro.
- [ ] Compra registrada pela balança cria `purchase` + `purchase_items` + `stock_movements` e **soma no estoque** — tudo numa transação.
- [ ] Catador obrigatório (usa existente por nome ou cria fornecedor).
- [ ] Desconto manual de impureza reflete no valor e no peso líquido salvo.
- [ ] Advisor: WARN de SECURITY DEFINER em `registrar_compra` é intencional; sem "RLS disabled".

**Saída:** balança operacional registrando compras e alimentando o estoque — base para o Plano 4 (conferência + caixa do dia).
