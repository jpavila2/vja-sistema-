# Plano 2 — Materiais + Pessoas (CRM) (MVP Sucata)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telas funcionais para cadastrar/listar/buscar/editar **materiais** (catálogo com preço) e **pessoas** (catadores/clientes), com validação e segurança por papel.

**Architecture:** Tabelas `materials` e `people` no Supabase com RLS (leitura para qualquer logado; escrita só admin/escritório). Validação com Zod (lógica pura, testada em TDD). UI em Server Components que buscam dados + Client Components reutilizáveis (`TabelaBusca`, `Campo`, `BotaoConfirmar`) para busca e formulários. Server Actions fazem as mutações.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, @supabase/ssr, Zod, Vitest + Testing Library.

**Base existente (Plano 1):** auth + RLS + `private.user_role()`; `src/lib/supabase/server.ts` e `client.ts`; `src/lib/format.ts` (`formatBRL`); rotas protegidas `(app)/escritorio`. Projeto Supabase: `zwgexgghhbtjmkxiqxis`.

---

## Estrutura de arquivos (criados neste plano)

- Migration Supabase: `materials`, `people`, trigger `set_updated_at`, RLS, seeds
- `supabase/migrations/0002_materiais_pessoas.sql` (cópia versionada)
- `src/lib/types.ts` — tipos `Material`, `Pessoa`
- `src/lib/schemas/material.ts` (+ test) — Zod
- `src/lib/schemas/pessoa.ts` (+ test) — Zod
- `src/components/Campo.tsx` — campo de formulário rotulado
- `src/components/TabelaBusca.tsx` (+ test) — tabela genérica com busca
- `src/components/BotaoConfirmar.tsx` — ação destrutiva com confirmação
- `src/app/(app)/escritorio/materiais/page.tsx` + `MateriaisLista.tsx` + `FormMaterial.tsx` + `actions.ts` + `novo/page.tsx` + `editar/[id]/page.tsx`
- `src/app/(app)/escritorio/pessoas/page.tsx` + `PessoasLista.tsx` + `FormPessoa.tsx` + `actions.ts` + `novo/page.tsx` + `editar/[id]/page.tsx`
- `src/app/(app)/escritorio/page.tsx` — atualizar com links de navegação

---

## Task 1: Migration — tabelas materials + people + RLS + seeds

**Files:** Supabase (via MCP `apply_migration`, project_id `zwgexgghhbtjmkxiqxis`) + `supabase/migrations/0002_materiais_pessoas.sql`

- [ ] **Step 1: Aplicar a migration** (MCP `apply_migration`, name `materiais_pessoas`)

```sql
-- trigger genérico de updated_at (SECURITY INVOKER — não exposto)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- MATERIAIS
create table public.materials (
  id bigint generated always as identity primary key,
  nome text not null,
  categoria text not null check (categoria in ('metal','plastico','papel','eletronico','outros')),
  unidade text not null default 'kg' check (unidade in ('kg','ton','un')),
  preco_compra numeric(12,2) not null default 0,
  estoque_atual numeric(12,3) not null default 0,
  estoque_minimo numeric(12,3) not null default 0,
  emoji text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger materials_set_updated before update on public.materials
  for each row execute function public.set_updated_at();
create index materials_ativo_idx on public.materials (ativo);

alter table public.materials enable row level security;
create policy materials_read on public.materials for select to authenticated using (true);
create policy materials_insert on public.materials for insert to authenticated
  with check ((select private.user_role()) in ('admin','escritorio'));
create policy materials_update on public.materials for update to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));
create policy materials_delete on public.materials for delete to authenticated
  using ((select private.user_role()) in ('admin','escritorio'));

-- PESSOAS
create table public.people (
  id bigint generated always as identity primary key,
  nome text not null,
  tipo text not null check (tipo in ('cliente','fornecedor','ambos')),
  documento text,
  telefone text,
  whatsapp text,
  endereco text,
  observacoes text,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger people_set_updated before update on public.people
  for each row execute function public.set_updated_at();
create index people_nome_idx on public.people (nome);
create index people_tipo_idx on public.people (tipo);

alter table public.people enable row level security;
create policy people_read on public.people for select to authenticated using (true);
create policy people_insert on public.people for insert to authenticated
  with check ((select private.user_role()) in ('admin','escritorio'));
create policy people_update on public.people for update to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));
create policy people_delete on public.people for delete to authenticated
  using ((select private.user_role()) in ('admin','escritorio'));

-- SEEDS
insert into public.materials (nome, categoria, unidade, preco_compra, emoji) values
  ('Papelão','papel','kg',0.80,'📦'),
  ('PET','plastico','kg',1.20,'🥤'),
  ('Plástico','plastico','kg',1.50,'♻️'),
  ('Alumínio','metal','kg',5.50,'🪙'),
  ('Ferro','metal','kg',0.90,'🔩'),
  ('Cobre','metal','kg',32.00,'🟧'),
  ('Inox','metal','kg',4.00,'⚙️'),
  ('Bateria','outros','un',6.00,'🔋');

insert into public.people (nome, tipo, telefone) values
  ('Seu Zé','fornecedor','(21) 99999-0001'),
  ('Marcão','fornecedor','(21) 99999-0002'),
  ('Recicladora Itaguaí','cliente','(21) 3333-0001'),
  ('Metais RJ','cliente','(21) 3333-0002');
```

- [ ] **Step 2: Verificar** (MCP `execute_sql`): `select count(*) from public.materials;` → 8; `select count(*) from public.people;` → 4.

- [ ] **Step 3: Advisors de segurança** (MCP `get_advisors` type `security`): confirmar que **não** há novo alerta de RLS desabilitado em `materials`/`people`. (O alerta pré-existente de `public.rls_auto_enable` pode continuar — não é deste plano.)

- [ ] **Step 4: Versionar o SQL** — criar `supabase/migrations/0002_materiais_pessoas.sql` com exatamente o SQL do Step 1 (cabeçalho de comentário indicando data e projeto). Commit:

```bash
git add supabase/migrations/0002_materiais_pessoas.sql
git commit -m "feat(db): tabelas materials e people com RLS, trigger updated_at e seeds"
```

---

## Task 2: Tipos + Zod schemas (TDD)

**Files:** Create `src/lib/types.ts`, `src/lib/schemas/material.ts` (+ `.test.ts`), `src/lib/schemas/pessoa.ts` (+ `.test.ts`). Requer `npm install zod`.

- [ ] **Step 1: Instalar zod**

Run: `npm install zod`

- [ ] **Step 2: Tipos do domínio**

Create `src/lib/types.ts`:
```ts
export type Categoria = "metal" | "plastico" | "papel" | "eletronico" | "outros";
export type Unidade = "kg" | "ton" | "un";

export type Material = {
  id: number;
  nome: string;
  categoria: Categoria;
  unidade: Unidade;
  preco_compra: number;
  estoque_atual: number;
  estoque_minimo: number;
  emoji: string | null;
  ativo: boolean;
};

export type TipoPessoa = "cliente" | "fornecedor" | "ambos";
export type StatusPessoa = "ativo" | "inativo";

export type Pessoa = {
  id: number;
  nome: string;
  tipo: TipoPessoa;
  documento: string | null;
  telefone: string | null;
  whatsapp: string | null;
  endereco: string | null;
  observacoes: string | null;
  status: StatusPessoa;
};
```

- [ ] **Step 3: Teste do schema de material (falha primeiro)**

Create `src/lib/schemas/material.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { materialSchema } from "@/lib/schemas/material";

describe("materialSchema", () => {
  it("aceita material válido e coage números", () => {
    const r = materialSchema.safeParse({
      nome: "Alumínio", categoria: "metal", unidade: "kg",
      preco_compra: "5.50", estoque_minimo: "10", emoji: "🪙",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.preco_compra).toBe(5.5);
      expect(r.data.estoque_minimo).toBe(10);
    }
  });
  it("rejeita nome curto", () => {
    const r = materialSchema.safeParse({ nome: "A", categoria: "metal", unidade: "kg", preco_compra: "1" });
    expect(r.success).toBe(false);
  });
  it("rejeita categoria inválida", () => {
    const r = materialSchema.safeParse({ nome: "Teste", categoria: "xyz", unidade: "kg", preco_compra: "1" });
    expect(r.success).toBe(false);
  });
  it("rejeita preço negativo", () => {
    const r = materialSchema.safeParse({ nome: "Teste", categoria: "metal", unidade: "kg", preco_compra: "-1" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 4: Rodar (FAIL)** — `npx vitest run src/lib/schemas/material.test.ts` → módulo não existe.

- [ ] **Step 5: Implementar `src/lib/schemas/material.ts`**

```ts
import { z } from "zod";

export const materialSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto"),
  categoria: z.enum(["metal", "plastico", "papel", "eletronico", "outros"]),
  unidade: z.enum(["kg", "ton", "un"]),
  preco_compra: z.coerce.number().min(0, "Preço não pode ser negativo"),
  estoque_minimo: z.coerce.number().min(0).default(0),
  emoji: z.string().trim().max(8).optional().or(z.literal("")),
});

export type MaterialInput = z.infer<typeof materialSchema>;
```

- [ ] **Step 6: Rodar (PASS)** — `npx vitest run src/lib/schemas/material.test.ts`.

- [ ] **Step 7: Teste do schema de pessoa (falha primeiro)**

Create `src/lib/schemas/pessoa.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { pessoaSchema } from "@/lib/schemas/pessoa";

describe("pessoaSchema", () => {
  it("aceita pessoa mínima (só nome e tipo)", () => {
    const r = pessoaSchema.safeParse({ nome: "Seu Zé", tipo: "fornecedor" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("ativo");
  });
  it("rejeita tipo inválido", () => {
    const r = pessoaSchema.safeParse({ nome: "Teste", tipo: "outro" });
    expect(r.success).toBe(false);
  });
  it("rejeita nome curto", () => {
    const r = pessoaSchema.safeParse({ nome: "X", tipo: "cliente" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 8: Rodar (FAIL)** — `npx vitest run src/lib/schemas/pessoa.test.ts`.

- [ ] **Step 9: Implementar `src/lib/schemas/pessoa.ts`**

```ts
import { z } from "zod";

const opcional = z.string().trim().optional().or(z.literal(""));

export const pessoaSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto"),
  tipo: z.enum(["cliente", "fornecedor", "ambos"]),
  documento: opcional,
  telefone: opcional,
  whatsapp: opcional,
  endereco: opcional,
  observacoes: opcional,
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});

export type PessoaInput = z.infer<typeof pessoaSchema>;
```

- [ ] **Step 10: Rodar (PASS)** + suíte completa `npx vitest run`. Commit:

```bash
git add -A
git commit -m "feat: tipos e schemas Zod de material e pessoa (TDD)"
```

---

## Task 3: Componentes reutilizáveis (Campo, TabelaBusca, BotaoConfirmar)

**Files:** Create `src/components/Campo.tsx`, `src/components/TabelaBusca.tsx` (+ `.test.tsx`), `src/components/BotaoConfirmar.tsx`.

- [ ] **Step 1: Teste da TabelaBusca (falha primeiro)**

Create `src/components/TabelaBusca.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabelaBusca } from "@/components/TabelaBusca";

type Item = { nome: string };
const itens: Item[] = [{ nome: "Alumínio" }, { nome: "Cobre" }, { nome: "Ferro" }];

describe("TabelaBusca", () => {
  it("renderiza todos e filtra pela busca", () => {
    render(
      <TabelaBusca<Item>
        itens={itens}
        campoBusca={(i) => i.nome}
        colunas={[{ titulo: "Nome", render: (i) => i.nome }]}
      />,
    );
    expect(screen.getByText("Alumínio")).toBeInTheDocument();
    expect(screen.getByText("Cobre")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Buscar..."), { target: { value: "cob" } });
    expect(screen.getByText("Cobre")).toBeInTheDocument();
    expect(screen.queryByText("Alumínio")).not.toBeInTheDocument();
  });

  it("mostra mensagem de vazio quando nada casa", () => {
    render(
      <TabelaBusca<Item>
        itens={itens}
        campoBusca={(i) => i.nome}
        colunas={[{ titulo: "Nome", render: (i) => i.nome }]}
        vazio="Nada aqui"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Buscar..."), { target: { value: "zzz" } });
    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar (FAIL)** — `npx vitest run src/components/TabelaBusca.test.tsx`.

- [ ] **Step 3: Implementar `src/components/TabelaBusca.tsx`**

```tsx
"use client";

import { useMemo, useState, type ReactNode } from "react";

export type Coluna<T> = {
  titulo: string;
  render: (item: T) => ReactNode;
  className?: string;
};

export function TabelaBusca<T>({
  itens,
  colunas,
  campoBusca,
  placeholder = "Buscar...",
  vazio = "Nada encontrado.",
}: {
  itens: T[];
  colunas: Coluna<T>[];
  campoBusca: (item: T) => string;
  placeholder?: string;
  vazio?: string;
}) {
  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((i) => campoBusca(i).toLowerCase().includes(termo));
  }, [q, itens, campoBusca]);

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border p-3 text-base"
      />
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              {colunas.map((c, i) => (
                <th key={i} className={"p-3 font-semibold " + (c.className ?? "")}>{c.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={colunas.length} className="p-6 text-center text-slate-400">{vazio}</td>
              </tr>
            ) : (
              filtrados.map((item, ri) => (
                <tr key={ri} className="border-b last:border-0">
                  {colunas.map((c, ci) => (
                    <td key={ci} className={"p-3 " + (c.className ?? "")}>{c.render(item)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar (PASS)** — `npx vitest run src/components/TabelaBusca.test.tsx`.

- [ ] **Step 5: Implementar `src/components/Campo.tsx`**

```tsx
import { type ReactNode } from "react";

export function Campo({ label, children, erro }: { label: string; children: ReactNode; erro?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {erro ? <span className="block text-xs text-red-600">{erro}</span> : null}
    </label>
  );
}
```

- [ ] **Step 6: Implementar `src/components/BotaoConfirmar.tsx`**

```tsx
"use client";

import { type ReactNode } from "react";

export function BotaoConfirmar({
  acao,
  mensagem,
  children,
  className = "",
  hidden,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  mensagem: string;
  children: ReactNode;
  className?: string;
  hidden?: Record<string, string | number>;
}) {
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm(mensagem)) e.preventDefault();
      }}
    >
      {hidden
        ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
        : null}
      <button type="submit" className={className}>{children}</button>
    </form>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: componentes reutilizáveis Campo, TabelaBusca (TDD) e BotaoConfirmar"
```

---

## Task 4: Materiais — Server Actions

**Files:** Create `src/app/(app)/escritorio/materiais/actions.ts`

- [ ] **Step 1: Implementar as actions**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { materialSchema } from "@/lib/schemas/material";

const LISTA = "/escritorio/materiais";

export async function salvarMaterial(_prev: unknown, formData: FormData) {
  const parsed = materialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const supabase = await createClient();
  const id = formData.get("id");
  const dados = parsed.data;

  if (id) {
    const { error } = await supabase.from("materials").update(dados).eq("id", Number(id));
    if (error) return { erro: error.message };
  } else {
    const { error } = await supabase.from("materials").insert(dados);
    if (error) return { erro: error.message };
  }
  revalidatePath(LISTA);
  redirect(LISTA);
}

export async function alternarAtivoMaterial(formData: FormData) {
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const ativoAtual = formData.get("ativo") === "true";
  await supabase.from("materials").update({ ativo: !ativoAtual }).eq("id", id);
  revalidatePath(LISTA);
}
```

- [ ] **Step 2: Verificar build** — `npm run build`. Commit:

```bash
git add -A
git commit -m "feat: server actions de material (salvar, alternar ativo)"
```

---

## Task 5: Materiais — Formulário, lista e páginas

**Files:** Create `FormMaterial.tsx`, `MateriaisLista.tsx`, `page.tsx`, `novo/page.tsx`, `editar/[id]/page.tsx` em `src/app/(app)/escritorio/materiais/`.

- [ ] **Step 1: Formulário reutilizável `FormMaterial.tsx`**

```tsx
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
      className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:opacity-50">
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
      <Campo label="Preço de compra (R$)">
        <input name="preco_compra" type="number" step="0.01" min="0"
          defaultValue={material?.preco_compra ?? 0} className={inputCls} />
      </Campo>
      <Campo label="Estoque mínimo">
        <input name="estoque_minimo" type="number" step="0.001" min="0"
          defaultValue={material?.estoque_minimo ?? 0} className={inputCls} />
      </Campo>
      <Campo label="Emoji (opcional)">
        <input name="emoji" maxLength={8} defaultValue={material?.emoji ?? ""} className={inputCls} />
      </Campo>
      {state?.erro ? <p className="text-sm text-red-600">{state.erro}</p> : null}
      <Salvar />
    </form>
  );
}
```

- [ ] **Step 2: Lista cliente `MateriaisLista.tsx`**

```tsx
"use client";

import Link from "next/link";
import { TabelaBusca } from "@/components/TabelaBusca";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { formatBRL } from "@/lib/format";
import { alternarAtivoMaterial } from "./actions";
import type { Material } from "@/lib/types";

export function MateriaisLista({ materiais }: { materiais: Material[] }) {
  return (
    <TabelaBusca<Material>
      itens={materiais}
      campoBusca={(m) => m.nome}
      placeholder="Buscar material..."
      vazio="Nenhum material cadastrado."
      colunas={[
        { titulo: "Material", render: (m) => <span>{m.emoji} {m.nome}</span> },
        { titulo: "Categoria", render: (m) => m.categoria },
        { titulo: "Preço compra", render: (m) => formatBRL(m.preco_compra) },
        { titulo: "Estoque", render: (m) => `${m.estoque_atual} ${m.unidade}` },
        {
          titulo: "Status",
          render: (m) => (
            <span className={m.ativo ? "text-green-700" : "text-slate-400"}>
              {m.ativo ? "Ativo" : "Inativo"}
            </span>
          ),
        },
        {
          titulo: "Ações",
          render: (m) => (
            <div className="flex gap-2">
              <Link href={`/escritorio/materiais/editar/${m.id}`} className="text-blue-600">Editar</Link>
              <BotaoConfirmar
                acao={alternarAtivoMaterial}
                hidden={{ id: m.id, ativo: String(m.ativo) }}
                mensagem={m.ativo ? `Inativar ${m.nome}?` : `Reativar ${m.nome}?`}
                className="text-slate-500"
              >
                {m.ativo ? "Inativar" : "Reativar"}
              </BotaoConfirmar>
            </div>
          ),
        },
      ]}
    />
  );
}
```

- [ ] **Step 3: Página de lista `page.tsx`**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MateriaisLista } from "./MateriaisLista";
import type { Material } from "@/lib/types";

export default async function MateriaisPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("materials").select("*").order("nome");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Materiais</h1>
        <Link href="/escritorio/materiais/novo"
          className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">+ Novo material</Link>
      </div>
      <MateriaisLista materiais={(data as Material[]) ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Página de novo `novo/page.tsx`**

```tsx
import Link from "next/link";
import { FormMaterial } from "../FormMaterial";

export default function NovoMaterialPage() {
  return (
    <div className="space-y-4">
      <Link href="/escritorio/materiais" className="text-blue-600">← Voltar</Link>
      <h1 className="text-2xl font-bold">Novo material</h1>
      <FormMaterial />
    </div>
  );
}
```

- [ ] **Step 5: Página de editar `editar/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormMaterial } from "../../FormMaterial";
import type { Material } from "@/lib/types";

export default async function EditarMaterialPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data } = await supabase.from("materials").select("*").eq("id", Number(params.id)).single();
  if (!data) notFound();
  return (
    <div className="space-y-4">
      <Link href="/escritorio/materiais" className="text-blue-600">← Voltar</Link>
      <h1 className="text-2xl font-bold">Editar material</h1>
      <FormMaterial material={data as Material} />
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

Run `npm run build`. Commit:
```bash
git add -A
git commit -m "feat: telas de materiais (lista com busca, novo, editar, inativar)"
```

---

## Task 6: Pessoas — Server Actions

**Files:** Create `src/app/(app)/escritorio/pessoas/actions.ts`

- [ ] **Step 1: Implementar**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pessoaSchema } from "@/lib/schemas/pessoa";

const LISTA = "/escritorio/pessoas";

export async function salvarPessoa(_prev: unknown, formData: FormData) {
  const parsed = pessoaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const supabase = await createClient();
  const id = formData.get("id");
  const dados = parsed.data;

  if (id) {
    const { error } = await supabase.from("people").update(dados).eq("id", Number(id));
    if (error) return { erro: error.message };
  } else {
    const { error } = await supabase.from("people").insert(dados);
    if (error) return { erro: error.message };
  }
  revalidatePath(LISTA);
  redirect(LISTA);
}

export async function alternarStatusPessoa(formData: FormData) {
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const statusAtual = String(formData.get("status"));
  const novo = statusAtual === "ativo" ? "inativo" : "ativo";
  await supabase.from("people").update({ status: novo }).eq("id", id);
  revalidatePath(LISTA);
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add -A
git commit -m "feat: server actions de pessoa (salvar, alternar status)"
```

---

## Task 7: Pessoas — Formulário, lista e páginas

**Files:** Create `FormPessoa.tsx`, `PessoasLista.tsx`, `page.tsx`, `novo/page.tsx`, `editar/[id]/page.tsx` em `src/app/(app)/escritorio/pessoas/`.

- [ ] **Step 1: `FormPessoa.tsx`**

```tsx
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
      className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:opacity-50">
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
```

- [ ] **Step 2: `PessoasLista.tsx`**

```tsx
"use client";

import Link from "next/link";
import { TabelaBusca } from "@/components/TabelaBusca";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { alternarStatusPessoa } from "./actions";
import type { Pessoa } from "@/lib/types";

const TIPO_LABEL: Record<Pessoa["tipo"], string> = {
  fornecedor: "Fornecedor",
  cliente: "Cliente",
  ambos: "Ambos",
};

export function PessoasLista({ pessoas }: { pessoas: Pessoa[] }) {
  return (
    <TabelaBusca<Pessoa>
      itens={pessoas}
      campoBusca={(p) => `${p.nome} ${p.telefone ?? ""} ${p.documento ?? ""}`}
      placeholder="Buscar por nome, telefone ou documento..."
      vazio="Nenhuma pessoa cadastrada."
      colunas={[
        { titulo: "Nome", render: (p) => p.nome },
        { titulo: "Tipo", render: (p) => TIPO_LABEL[p.tipo] },
        { titulo: "Telefone", render: (p) => p.telefone ?? "—" },
        {
          titulo: "Status",
          render: (p) => (
            <span className={p.status === "ativo" ? "text-green-700" : "text-slate-400"}>
              {p.status === "ativo" ? "Ativo" : "Inativo"}
            </span>
          ),
        },
        {
          titulo: "Ações",
          render: (p) => (
            <div className="flex gap-2">
              <Link href={`/escritorio/pessoas/editar/${p.id}`} className="text-blue-600">Editar</Link>
              <BotaoConfirmar
                acao={alternarStatusPessoa}
                hidden={{ id: p.id, status: p.status }}
                mensagem={p.status === "ativo" ? `Inativar ${p.nome}?` : `Reativar ${p.nome}?`}
                className="text-slate-500"
              >
                {p.status === "ativo" ? "Inativar" : "Reativar"}
              </BotaoConfirmar>
            </div>
          ),
        },
      ]}
    />
  );
}
```

- [ ] **Step 3: `page.tsx`**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PessoasLista } from "./PessoasLista";
import type { Pessoa } from "@/lib/types";

export default async function PessoasPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("*").order("nome");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pessoas (catadores / clientes)</h1>
        <Link href="/escritorio/pessoas/novo"
          className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">+ Nova pessoa</Link>
      </div>
      <PessoasLista pessoas={(data as Pessoa[]) ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: `novo/page.tsx`**

```tsx
import Link from "next/link";
import { FormPessoa } from "../FormPessoa";

export default function NovaPessoaPage() {
  return (
    <div className="space-y-4">
      <Link href="/escritorio/pessoas" className="text-blue-600">← Voltar</Link>
      <h1 className="text-2xl font-bold">Nova pessoa</h1>
      <FormPessoa />
    </div>
  );
}
```

- [ ] **Step 5: `editar/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormPessoa } from "../../FormPessoa";
import type { Pessoa } from "@/lib/types";

export default async function EditarPessoaPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("*").eq("id", Number(params.id)).single();
  if (!data) notFound();
  return (
    <div className="space-y-4">
      <Link href="/escritorio/pessoas" className="text-blue-600">← Voltar</Link>
      <h1 className="text-2xl font-bold">Editar pessoa</h1>
      <FormPessoa pessoa={data as Pessoa} />
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add -A
git commit -m "feat: telas de pessoas (lista com busca, novo, editar, inativar)"
```

---

## Task 8: Navegação no escritório + verificação E2E

**Files:** Modify `src/app/(app)/escritorio/page.tsx`

- [ ] **Step 1: Atualizar a home do escritório com os atalhos**

```tsx
import Link from "next/link";

export default function EscritorioPage() {
  const cards = [
    { href: "/escritorio/materiais", titulo: "Materiais", desc: "Catálogo e preços" },
    { href: "/escritorio/pessoas", titulo: "Pessoas", desc: "Catadores e clientes" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Escritório</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}
            className="rounded-2xl border bg-white p-5 shadow-sm hover:border-green-500">
            <div className="text-lg font-bold">{c.titulo}</div>
            <div className="text-sm text-slate-500">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Suíte + build**

Run `npx vitest run` (todos verdes) e `npm run build` (sem erro).

- [ ] **Step 3: Verificação E2E manual/Playwright**

Subir `npm run dev`. Logar como `escritorio@sucata.local` / `sucata123`:
1. Em `/escritorio`, clicar em **Materiais** → ver os 8 seeds na tabela.
2. Buscar "alu" → só Alumínio aparece.
3. **+ Novo material** → preencher (nome "Latinha", metal, kg, 5.00) → Salvar → volta à lista com "Latinha".
4. **Editar** "Latinha" → mudar preço → Salvar → valor atualizado.
5. **Inativar** "Latinha" → confirma → status vira Inativo.
6. Ir em **Pessoas** → ver os 4 seeds; criar uma nova pessoa; editar; inativar.
7. (RLS) Logar como `balanca@sucata.local` e confirmar que **não** acessa `/escritorio/materiais` (middleware redireciona para `/balanca`).

Expected: todos os passos funcionam; dados persistem no Supabase.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: navegação do escritório para materiais e pessoas"
```

---

## Verificação final do Plano 2

- [ ] `npx vitest run` → verde (format, auth, material, pessoa, TabelaBusca).
- [ ] `npm run build` → sem erros.
- [ ] CRUD de materiais e pessoas funcionando E2E com persistência no Supabase.
- [ ] RLS: balança não acessa as telas do escritório; leitura ok para logados.
- [ ] `get_advisors(security)` sem novo alerta de RLS desabilitado.

**Saída deste plano:** catálogo de materiais e cadastro de pessoas operacionais — base pronta para o Plano 3 (Compras + Estoque), onde a tela da balança usa materiais e pessoas.
