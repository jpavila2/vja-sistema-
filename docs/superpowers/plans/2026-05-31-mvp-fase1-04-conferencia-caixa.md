# Plano 4 — Conferência + Caixa do dia + Painel (MVP Sucata)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Passos com checkbox `- [ ]`.

**Goal:** Fechar o ciclo do dia: a atendente do escritório **confere/cancela** as compras lançadas na balança, e todos veem o **caixa do dia** (total comprado, nº de compras, ticket médio) automático — substituindo o Excel manual. Painel do admin com o resumo.

**Architecture:** Conferir = update simples em `purchases` (RLS já permite admin/escritório). Cancelar = função transacional `cancelar_compra` (SECURITY DEFINER) que marca `cancelada`, gera `stock_movements` de estorno e devolve o estoque. O caixa e o painel são Server Components que buscam as compras do dia (janela calculada no fuso America/São_Paulo) e agregam com helpers puros (testados em TDD).

**Tech Stack:** Next.js 14, TS, Tailwind (tema `marca`), Supabase, Zod, Vitest.

**Base (Planos 1-3):** `purchases/purchase_items/stock_movements`, `materials`, RLS, `private.user_role()`, `registrar_compra`, `@/lib/format` (`formatBRL`), componentes `Campo`/`BotaoConfirmar`, tema `marca-*`. Projeto: `zwgexgghhbtjmkxiqxis`.

---

## Estrutura de arquivos

- Migration + `supabase/migrations/0004_cancelar_compra.sql`
- `src/lib/datas.ts` (+ test) — `limitesDoDiaBR(dia)`
- `src/lib/caixa.ts` (+ test) — `resumoCaixa(compras)`
- `src/components/CardResumo.tsx` — card de KPI
- `src/app/(app)/escritorio/conferencia/actions.ts` — `conferirCompra`, `cancelarCompra`
- `src/app/(app)/escritorio/conferencia/page.tsx` + `ListaConferencia.tsx`
- `src/app/(app)/escritorio/caixa/page.tsx`
- `src/app/(app)/page.tsx` — painel admin com resumo do dia
- `src/app/(app)/escritorio/page.tsx` — adicionar cards Conferência e Caixa

---

## Task 1: Migration — função cancelar_compra

**Files:** Supabase + `supabase/migrations/0004_cancelar_compra.sql`

- [ ] **Step 1: Aplicar** (name `cancelar_compra`)

```sql
create or replace function public.cancelar_compra(p_id bigint, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_papel text;
  v_status text;
  v_item record;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid;
  if v_papel not in ('admin','escritorio') then raise exception 'sem permissão'; end if;

  select status into v_status from public.purchases where id = p_id for update;
  if v_status is null then raise exception 'compra não encontrada'; end if;
  if v_status = 'cancelada' then raise exception 'compra já cancelada'; end if;

  -- estorna o estoque de cada item e registra o movimento
  for v_item in select id, material_id, peso_liquido from public.purchase_items where purchase_id = p_id
  loop
    update public.materials set estoque_atual = estoque_atual - v_item.peso_liquido
      where id = v_item.material_id;
    insert into public.stock_movements (material_id, tipo, quantidade, purchase_item_id, motivo, created_by)
    values (v_item.material_id, 'estorno', -v_item.peso_liquido, v_item.id, 'cancelamento da compra', v_uid);
  end loop;

  update public.purchases
    set status = 'cancelada', motivo_cancelamento = nullif(btrim(coalesce(p_motivo,'')), '')
    where id = p_id;
end;
$$;

revoke execute on function public.cancelar_compra(bigint, text) from public, anon;
grant execute on function public.cancelar_compra(bigint, text) to authenticated;
```

- [ ] **Step 2: Advisors** (`get_advisors` security) — WARN de SECURITY DEFINER em `cancelar_compra` é intencional. Versionar SQL em `supabase/migrations/0004_cancelar_compra.sql`. Commit:
```bash
git add supabase/migrations/0004_cancelar_compra.sql
git commit -m "feat(db): função cancelar_compra (estorno de estoque transacional)"
```

---

## Task 2: Helpers de data e caixa (TDD)

**Files:** `src/lib/datas.ts` (+ test), `src/lib/caixa.ts` (+ test)

- [ ] **Step 1: Teste `limitesDoDiaBR` (falha)** — `src/lib/datas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { limitesDoDiaBR } from "@/lib/datas";

describe("limitesDoDiaBR", () => {
  it("retorna janela UTC do dia no fuso -03:00", () => {
    const { inicio, fim } = limitesDoDiaBR("2026-05-31");
    expect(inicio).toBe("2026-05-31T03:00:00.000Z");
    expect(fim).toBe("2026-06-01T03:00:00.000Z");
  });
});
```

- [ ] **Step 2: Rodar (FAIL).**

- [ ] **Step 3: Implementar `src/lib/datas.ts`** (Brasil = UTC-3, sem horário de verão):
```ts
/** Janela [início, fim) de um dia (YYYY-MM-DD) no fuso America/Sao_Paulo (UTC-3), em ISO UTC. */
export function limitesDoDiaBR(dia: string): { inicio: string; fim: string } {
  const inicio = new Date(`${dia}T00:00:00-03:00`);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

/** Dia de hoje (YYYY-MM-DD) no fuso America/Sao_Paulo. */
export function hojeBR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
```

- [ ] **Step 4: Rodar (PASS).**

- [ ] **Step 5: Teste `resumoCaixa` (falha)** — `src/lib/caixa.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resumoCaixa } from "@/lib/caixa";

describe("resumoCaixa", () => {
  it("agrega só as não-canceladas", () => {
    const r = resumoCaixa([
      { total: 100, status: "pendente" },
      { total: 50, status: "conferida" },
      { total: 999, status: "cancelada" },
    ]);
    expect(r.totalComprado).toBe(150);
    expect(r.qtdCompras).toBe(2);
    expect(r.ticketMedio).toBe(75);
  });
  it("vazio => zeros", () => {
    const r = resumoCaixa([]);
    expect(r).toEqual({ totalComprado: 0, qtdCompras: 0, ticketMedio: 0 });
  });
});
```

- [ ] **Step 6: Rodar (FAIL).**

- [ ] **Step 7: Implementar `src/lib/caixa.ts`**:
```ts
export type CompraResumo = { total: number; status: string };
export type ResumoCaixa = { totalComprado: number; qtdCompras: number; ticketMedio: number };

export function resumoCaixa(compras: CompraResumo[]): ResumoCaixa {
  const validas = compras.filter((c) => c.status !== "cancelada");
  const totalComprado = Math.round(validas.reduce((s, c) => s + c.total, 0) * 100) / 100;
  const qtdCompras = validas.length;
  const ticketMedio = qtdCompras === 0 ? 0 : Math.round((totalComprado / qtdCompras) * 100) / 100;
  return { totalComprado, qtdCompras, ticketMedio };
}
```

- [ ] **Step 8: Rodar (PASS)** + suíte completa. Commit:
```bash
git add -A
git commit -m "feat: helpers limitesDoDiaBR e resumoCaixa (TDD)"
```

---

## Task 3: Componente CardResumo

**Files:** `src/components/CardResumo.tsx`

- [ ] **Step 1: Implementar**
```tsx
import { type ReactNode } from "react";

export function CardResumo({ titulo, valor, cor = "navy" }: {
  titulo: string;
  valor: ReactNode;
  cor?: "navy" | "teal" | "green" | "gold";
}) {
  const cores = {
    navy: "text-marca-navy",
    teal: "text-marca-teal-dark",
    green: "text-marca-green-dark",
    gold: "text-marca-gold",
  } as const;
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{titulo}</div>
      <div className={"mt-1 text-3xl font-black " + cores[cor]}>{valor}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit** (`git add -A && git commit -m "feat: componente CardResumo (KPI)"`)

---

## Task 4: Conferência (actions + página)

**Files:** `src/app/(app)/escritorio/conferencia/actions.ts`, `page.tsx`, `ListaConferencia.tsx`

- [ ] **Step 1: actions.ts**
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function conferirCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("purchases")
    .update({ status: "conferida", conferida_por: user?.id, conferida_em: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/escritorio/conferencia");
}

export async function cancelarCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "");
  const supabase = await createClient();
  await supabase.rpc("cancelar_compra", { p_id: id, p_motivo: motivo });
  revalidatePath("/escritorio/conferencia");
  revalidatePath("/escritorio/caixa");
  revalidatePath("/escritorio/materiais");
}
```

- [ ] **Step 2: page.tsx** (compras do dia, com itens)
```tsx
import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { ListaConferencia } from "./ListaConferencia";

export default async function ConferenciaPage() {
  const dia = hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("id, total, status, data_hora, observacoes, people(nome), purchase_items(id, peso_liquido, preco_unitario, subtotal, materials(nome, emoji, unidade))")
    .gte("data_hora", inicio).lt("data_hora", fim)
    .order("data_hora", { ascending: false });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-marca-navy">Conferência do dia</h1>
      <ListaConferencia compras={data ?? []} />
    </div>
  );
}
```

- [ ] **Step 3: ListaConferencia.tsx** (client; lista, conferir, cancelar)
```tsx
"use client";

import { formatBRL } from "@/lib/format";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { conferirCompra, cancelarCompra } from "./actions";

type Item = { id: number; peso_liquido: number; preco_unitario: number; subtotal: number; materials: { nome: string; emoji: string | null; unidade: string } | null };
type Compra = { id: number; total: number; status: string; data_hora: string; observacoes: string | null; people: { nome: string } | null; purchase_items: Item[] };

const BADGE: Record<string, string> = {
  pendente: "bg-marca-gold-light text-marca-gold",
  conferida: "bg-marca-teal-light text-marca-teal-dark",
  cancelada: "bg-red-100 text-red-600",
};

export function ListaConferencia({ compras }: { compras: Compra[] }) {
  if (compras.length === 0) {
    return <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">Nenhuma compra hoje.</p>;
  }
  return (
    <div className="space-y-3">
      {compras.map((c) => (
        <div key={c.id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-marca-navy">{c.people?.nome ?? "—"}</span>
            <span className={"rounded-full px-2 py-0.5 text-xs font-bold " + (BADGE[c.status] ?? "")}>{c.status}</span>
            <span className="text-sm text-slate-500">
              {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
            </span>
            <span className="ml-auto text-xl font-black text-marca-navy">{formatBRL(c.total)}</span>
          </div>
          <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
            {c.purchase_items.map((it) => (
              <li key={it.id}>
                {it.materials?.emoji} {it.materials?.nome}: {it.peso_liquido.toLocaleString("pt-BR")} {it.materials?.unidade} × {formatBRL(it.preco_unitario)} = {formatBRL(it.subtotal)}
              </li>
            ))}
          </ul>
          {c.status === "pendente" ? (
            <div className="mt-3 flex gap-2">
              <form action={conferirCompra}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-full bg-marca-teal px-4 py-2 text-sm font-bold text-white hover:bg-marca-teal-dark">
                  ✓ Conferir
                </button>
              </form>
              <BotaoConfirmar
                acao={cancelarCompra}
                hidden={{ id: c.id, motivo: "cancelada na conferência" }}
                mensagem={`Cancelar a compra de ${c.people?.nome ?? "—"} (${formatBRL(c.total)})? O estoque será estornado.`}
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                Cancelar
              </BotaoConfirmar>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Build + commit** (`npm run build`; `git commit -m "feat: tela de conferência (conferir/cancelar compras do dia)"`)

---

## Task 5: Caixa do dia

**Files:** `src/app/(app)/escritorio/caixa/page.tsx`

- [ ] **Step 1: page.tsx** (KPIs do dia + lista resumida)
```tsx
import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { resumoCaixa } from "@/lib/caixa";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";

export default async function CaixaPage({ searchParams }: { searchParams: { dia?: string } }) {
  const dia = searchParams.dia ?? hojeBR();
  const { inicio, fim } = limitesDoDiaBR(dia);
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("id, total, status, data_hora, people(nome)")
    .gte("data_hora", inicio).lt("data_hora", fim)
    .order("data_hora", { ascending: false });
  const compras = data ?? [];
  const r = resumoCaixa(compras.map((c) => ({ total: c.total, status: c.status })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca-navy">Caixa do dia</h1>
        <form><input type="date" name="dia" defaultValue={dia} className="rounded-xl border p-2" /></form>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CardResumo titulo="Total comprado" valor={formatBRL(r.totalComprado)} cor="teal" />
        <CardResumo titulo="Compras" valor={r.qtdCompras} cor="navy" />
        <CardResumo titulo="Ticket médio" valor={formatBRL(r.ticketMedio)} cor="gold" />
      </div>
      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 p-3 font-bold text-marca-navy">Compras de {new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR")}</div>
        {compras.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhuma compra.</div>
        ) : compras.map((c) => (
          <div key={c.id} className={"flex items-center gap-3 border-b p-3 last:border-0 " + (c.status === "cancelada" ? "opacity-50 line-through" : "")}>
            <span className="font-semibold text-marca-navy">{c.people?.nome ?? "—"}</span>
            <span className="ml-auto font-bold">{formatBRL(c.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit** (`git commit -m "feat: caixa do dia (KPIs + lista, filtro por data)"`)

---

## Task 6: Painel do admin + navegação

**Files:** `src/app/(app)/page.tsx`, `src/app/(app)/escritorio/page.tsx`

- [ ] **Step 1: Painel `src/app/(app)/page.tsx`** (resumo do dia)
```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hojeBR, limitesDoDiaBR } from "@/lib/datas";
import { resumoCaixa } from "@/lib/caixa";
import { formatBRL } from "@/lib/format";
import { CardResumo } from "@/components/CardResumo";

export default async function PainelPage() {
  const { inicio, fim } = limitesDoDiaBR(hojeBR());
  const supabase = await createClient();
  const { data } = await supabase.from("purchases").select("total, status")
    .gte("data_hora", inicio).lt("data_hora", fim);
  const r = resumoCaixa(data ?? []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-marca-navy">Painel — hoje</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <CardResumo titulo="Comprado hoje" valor={formatBRL(r.totalComprado)} cor="teal" />
        <CardResumo titulo="Compras" valor={r.qtdCompras} cor="navy" />
        <CardResumo titulo="Ticket médio" valor={formatBRL(r.ticketMedio)} cor="gold" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/balanca" className="rounded-full bg-marca-teal px-5 py-3 font-bold text-white hover:bg-marca-teal-dark">Nova compra</Link>
        <Link href="/escritorio/conferencia" className="rounded-full border px-5 py-3 font-bold text-marca-navy hover:bg-slate-100">Conferência</Link>
        <Link href="/escritorio/caixa" className="rounded-full border px-5 py-3 font-bold text-marca-navy hover:bg-slate-100">Caixa do dia</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar cards em `escritorio/page.tsx`** — incluir no array `cards`:
```tsx
    { href: "/escritorio/conferencia", titulo: "Conferência", desc: "Conferir compras do dia" },
    { href: "/escritorio/caixa", titulo: "Caixa do dia", desc: "Resumo financeiro" },
```

- [ ] **Step 3: Build + suíte + commit** (`git commit -m "feat: painel do admin com resumo do dia + navegação"`)

---

## Task 7: Verificação E2E

- [ ] **Step 1:** `npm run dev`. Como `balanca`, registrar 1-2 compras. Como `escritorio`: abrir **Conferência** → ver as compras pendentes com itens → **Conferir** uma (vira "conferida") e **Cancelar** outra (confirma, estoque estorna). Abrir **Caixa do dia** → KPIs batem (canceladas não contam). Como `admin`: **Painel** mostra o resumo de hoje.
- [ ] **Step 2:** Conferir no banco: compra cancelada tem `status=cancelada` + movimentos de `estorno`; estoque do material voltou. Caixa ignora cancelada.
- [ ] **Step 3:** Limpar dados de teste (estornar/remover compras de teste, como no Plano 3).

---

## Verificação final

- [ ] `npx vitest run` verde; `npm run build` ok.
- [ ] Conferir e cancelar funcionam; cancelamento estorna estoque (transacional).
- [ ] Caixa do dia e painel mostram totais corretos no fuso BR, ignorando canceladas.
- [ ] **MVP (Fase 1) completo:** login, materiais, pessoas, compras/balança, estoque, conferência e caixa.
