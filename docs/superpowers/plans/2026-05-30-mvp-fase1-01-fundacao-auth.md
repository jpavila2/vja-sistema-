# Plano 1 — Fundação + Autenticação (MVP Sucata)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ter um app Next.js que sobe, com login por e-mail/senha, 3 perfis (admin/escritório/balança), proteção de rotas por papel e RLS no Supabase — tudo com base de testes verde.

**Architecture:** Next.js 14 App Router + TypeScript + Tailwind. Auth e banco no Supabase via `@supabase/ssr` (cookies). Perfis e papéis em `public.profiles`; papel do usuário lido por função `security definer` em schema `private` e usado nas políticas RLS. Lógica pura (formatação/cálculo) coberta por testes Vitest.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, @supabase/ssr, @supabase/supabase-js, Vitest, @testing-library/react, jsdom, Zod.

**Pré-requisito manual:** o João cria a **organização `Sucata`** no painel Supabase (app.supabase.com → New organization → plano Free). O projeto em si é criado na Task 5 via MCP.

---

## Estrutura de arquivos (criados neste plano)

- `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs` — scaffold
- `vitest.config.ts`, `vitest.setup.ts` — base de testes
- `src/lib/format.ts` + `src/lib/format.test.ts` — formatação BRL e cálculo de subtotal (lógica pura, TDD)
- `src/lib/supabase/client.ts` — client de browser
- `src/lib/supabase/server.ts` — client de servidor (cookies)
- `src/middleware.ts` — refresh de sessão + guarda de rota
- `src/app/login/page.tsx` + `src/app/login/actions.ts` — tela e ação de login
- `src/app/(app)/layout.tsx` — shell autenticado + leitura do papel
- `src/app/(app)/page.tsx` — painel admin (placeholder)
- `src/app/(app)/escritorio/page.tsx`, `src/app/(app)/balanca/page.tsx` — placeholders protegidos
- `src/lib/auth.ts` + `src/lib/auth.test.ts` — `rotaPermitida(papel, rota)` (lógica pura de autorização, TDD)
- `.env.local` — chaves do Supabase
- Migration Supabase: `profiles` + RLS + `private.user_role()`

---

## Task 1: Scaffold do projeto Next.js

**Files:**
- Create: estrutura do `create-next-app` na raiz `/Users/joao/projetos/VJA-SISTEMA`

- [ ] **Step 1: Criar o app Next.js**

O diretório já tem `mockups/` e `docs/`. Use `.` como destino e aceite mesclar.
**Fixamos o Next 14** (React 18) — o código deste plano usa `useFormState`, que no React 19/Next 15 vira `useActionState`. Manter 14 evita essa divergência.

Run:
```bash
cd /Users/joao/projetos/VJA-SISTEMA
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
Quando perguntar sobre arquivos existentes, mantenha (`mockups/`, `docs/`, `.git`).

- [ ] **Step 2: Subir o servidor e verificar**

Run: `npm run dev`
Expected: servidor em `http://localhost:3000` mostrando a página inicial do Next. Encerre com Ctrl+C.

- [ ] **Step 3: Definir locale e timezone padrão**

Edite `src/app/layout.tsx`: trocar `<html lang="en">` por `<html lang="pt-BR">`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 + TypeScript + Tailwind"
```

---

## Task 2: Base de testes (Vitest)

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json` (script `test`)

- [ ] **Step 1: Instalar dependências de teste**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Criar `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Adicionar script de teste em `package.json`**

No bloco `"scripts"`, adicione:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Teste-fumaça para provar que o harness roda**

Create `src/lib/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("harness", () => {
  it("soma", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Rodar e confirmar verde**

Run: `npm test`
Expected: 1 arquivo, 1 teste, PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: configura Vitest + Testing Library"
```

---

## Task 3: Utilitários de formatação e cálculo (TDD)

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`
- Remove: `src/lib/smoke.test.ts` (substituído)

- [ ] **Step 1: Escrever os testes que falham**

Create `src/lib/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatBRL, calcSubtotal } from "@/lib/format";

describe("formatBRL", () => {
  it("formata em reais", () => {
    expect(formatBRL(68.2)).toBe("R$ 68,20");
    expect(formatBRL(0)).toBe("R$ 0,00");
    expect(formatBRL(1234.5)).toBe("R$ 1.234,50");
  });
});

describe("calcSubtotal", () => {
  it("multiplica peso por preço com 2 casas (meio pra cima)", () => {
    expect(calcSubtotal(12.4, 5.5)).toBe(68.2);
    expect(calcSubtotal(0.001, 0.005)).toBe(0); // 0.000005 arredonda pra 0
    expect(calcSubtotal(1.005, 1)).toBe(1.01);  // meio pra cima
  });
  it("nunca retorna negativo", () => {
    expect(calcSubtotal(-1, 5)).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test src/lib/format.test.ts`
Expected: FAIL — `formatBRL`/`calcSubtotal` não existem.

- [ ] **Step 3: Implementar o mínimo**

Create `src/lib/format.ts`:
```ts
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Arredonda para 2 casas, meio pra cima, sem valores negativos. */
export function calcSubtotal(pesoLiquido: number, precoUnitario: number): number {
  if (pesoLiquido <= 0 || precoUnitario <= 0) return 0;
  const bruto = pesoLiquido * precoUnitario;
  return Math.round((bruto + Number.EPSILON) * 100) / 100;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test src/lib/format.test.ts`
Expected: PASS. Depois remova o smoke: `git rm src/lib/smoke.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: utilitários de formatação BRL e cálculo de subtotal (TDD)"
```

---

## Task 4: Autorização por papel — `rotaPermitida` (TDD)

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`

Regra (da spec): balança → só `/balanca`; escritório → `/escritorio` e `/balanca`; admin → tudo.

- [ ] **Step 1: Escrever os testes que falham**

Create `src/lib/auth.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rotaPermitida, type Papel } from "@/lib/auth";

const casos: [Papel, string, boolean][] = [
  ["admin", "/", true],
  ["admin", "/escritorio", true],
  ["admin", "/balanca", true],
  ["escritorio", "/", false],
  ["escritorio", "/escritorio", true],
  ["escritorio", "/balanca", true],
  ["balanca", "/", false],
  ["balanca", "/escritorio", false],
  ["balanca", "/balanca", true],
];

describe("rotaPermitida", () => {
  for (const [papel, rota, esperado] of casos) {
    it(`${papel} em ${rota} => ${esperado}`, () => {
      expect(rotaPermitida(papel, rota)).toBe(esperado);
    });
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test src/lib/auth.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Create `src/lib/auth.ts`:
```ts
export type Papel = "admin" | "escritorio" | "balanca";

const ACESSO: Record<Papel, string[]> = {
  admin: ["/", "/escritorio", "/balanca"],
  escritorio: ["/escritorio", "/balanca"],
  balanca: ["/balanca"],
};

/** rota base permitida para o papel (compara pelo primeiro segmento). */
export function rotaPermitida(papel: Papel, rota: string): boolean {
  const base = "/" + (rota.split("/")[1] ?? "");
  const normal = base === "/" ? "/" : base;
  return ACESSO[papel].includes(normal);
}

/** rota inicial padrão de cada papel. */
export function rotaInicial(papel: Papel): string {
  return papel === "admin" ? "/" : papel === "escritorio" ? "/escritorio" : "/balanca";
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test src/lib/auth.test.ts`
Expected: PASS (9 casos).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: regra de autorização por papel rotaPermitida/rotaInicial (TDD)"
```

---

## Task 5: Projeto Supabase + migration de `profiles` + RLS

**Files:**
- Banco Supabase (via MCP): tabela `profiles`, schema `private`, função `user_role`, políticas.
- Create: `.env.local`

- [ ] **Step 1: Criar o projeto na organização `Sucata`**

Confirme o ID da org (`list_organizations`). Use a MCP do Supabase:
`create_project` com `name: "sucata-mvp"`, `organization_id: <id da org Sucata>`, região mais próxima (`sa-east-1` São Paulo). Anote o `project_id`.

- [ ] **Step 2: Aplicar a migration de perfis + RLS**

Via MCP `apply_migration` (name: `init_profiles`):
```sql
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('admin','escritorio','balanca')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- cada usuário lê o próprio perfil
create policy "profiles_self_read" on public.profiles
  for select using ((select auth.uid()) = id);

-- papel do usuário atual (bypassa RLS; usado nas políticas)
create or replace function private.user_role()
returns text language sql security definer set search_path = '' stable as $$
  select papel from public.profiles where id = (select auth.uid());
$$;

revoke execute on function private.user_role() from public, anon;
grant execute on function private.user_role() to authenticated;

-- admin enxerga e gere todos os perfis
create policy "profiles_admin_all" on public.profiles
  for all using ((select private.user_role()) = 'admin')
  with check ((select private.user_role()) = 'admin');

create index profiles_papel_idx on public.profiles (papel);
```

- [ ] **Step 3: Conferir avisos de segurança**

Via MCP `get_advisors` (type: `security`). Expected: sem erro de "RLS disabled" em `public.profiles`. Corrija se aparecer.

- [ ] **Step 4: Pegar URL e chave pública e gravar `.env.local`**

Use MCP `get_project_url` e `get_publishable_keys`. Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>
```
Confirme que `.env*` está no `.gitignore` (já está).

- [ ] **Step 5: Commit (sem segredos)**

```bash
git add -A
git commit -m "feat: projeto Supabase + tabela profiles com RLS por papel"
```

---

## Task 6: Clients Supabase (`@supabase/ssr`)

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

- [ ] **Step 1: Instalar libs**

Run: `npm install @supabase/ssr @supabase/supabase-js`

- [ ] **Step 2: Client de browser**

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Client de servidor (cookies)**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // chamado de um Server Component — middleware cuida do refresh
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Verificar compilação**

Run: `npm run build`
Expected: build conclui sem erro de tipo (warnings de "no pages" tudo bem nesta fase).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: clients Supabase browser/server via @supabase/ssr"
```

---

## Task 7: Middleware de sessão + guarda de rota

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Criar o middleware**

Create `src/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rotaPermitida, rotaInicial, type Papel } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isLogin = path === "/login";

  if (!user && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("papel")
      .eq("id", user.id)
      .single();
    const papel = profile?.papel as Papel | undefined;

    if (isLogin && papel) {
      return NextResponse.redirect(new URL(rotaInicial(papel), request.url));
    }
    if (papel && !isLogin && !rotaPermitida(papel, path)) {
      return NextResponse.redirect(new URL(rotaInicial(papel), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: compila. (Sem usuários ainda; o redirect pra `/login` será testado na Task 9.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: middleware de sessão Supabase + guarda de rota por papel"
```

---

## Task 8: Tela de login

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/login/actions.ts`

- [ ] **Step 1: Ação de login (server action)**

Create `src/app/login/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rotaInicial, type Papel } from "@/lib/auth";

export async function login(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error || !data.user) {
    return { erro: "E-mail ou senha inválidos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("papel")
    .eq("id", data.user.id)
    .single();

  redirect(rotaInicial((profile?.papel as Papel) ?? "balanca"));
}
```

- [ ] **Step 2: Página de login**

Create `src/app/login/page.tsx`:
```tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";

const estadoInicial = { erro: "" };

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-green-600 py-3 text-lg font-bold text-white disabled:opacity-50"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, estadoInicial);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-extrabold">♻️ Sistema Sucata</h1>
        <input name="email" type="email" required placeholder="E-mail"
          className="w-full rounded-xl border p-3 text-lg" />
        <input name="senha" type="password" required placeholder="Senha"
          className="w-full rounded-xl border p-3 text-lg" />
        {state?.erro ? <p className="text-sm text-red-600">{state.erro}</p> : null}
        <Botao />
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: compila sem erro.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: tela de login com server action"
```

---

## Task 9: Shell autenticado + páginas protegidas + usuários de teste

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/escritorio/page.tsx`, `src/app/(app)/balanca/page.tsx`
- Modify: remover `src/app/page.tsx` padrão do scaffold (movido para o grupo `(app)`)

- [ ] **Step 1: Remover a home padrão do scaffold**

Run: `git rm src/app/page.tsx`

- [ ] **Step 2: Layout autenticado com saudação + logout**

Create `src/app/(app)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, papel")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-white px-5 py-3 shadow">
        <span className="text-lg font-extrabold">♻️ Sucata</span>
        <span className="text-sm text-slate-500">
          {profile?.nome} · {profile?.papel}
        </span>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Páginas placeholder**

Create `src/app/(app)/page.tsx`:
```tsx
export default function PainelPage() {
  return <h1 className="text-2xl font-bold">Painel (admin) — em construção</h1>;
}
```
Create `src/app/(app)/escritorio/page.tsx`:
```tsx
export default function EscritorioPage() {
  return <h1 className="text-2xl font-bold">Escritório — em construção</h1>;
}
```
Create `src/app/(app)/balanca/page.tsx`:
```tsx
export default function BalancaPage() {
  return <h1 className="text-2xl font-bold">Balança — em construção</h1>;
}
```

- [ ] **Step 4: Criar 3 usuários de teste no Supabase**

No painel Supabase → Authentication → Users → Add user (email + senha, "Auto Confirm"):
- `admin@sucata.local`
- `escritorio@sucata.local`
- `balanca@sucata.local`

Depois, via MCP `execute_sql`, criar os perfis ligando por e-mail:
```sql
insert into public.profiles (id, nome, papel)
select id, 'Admin', 'admin' from auth.users where email = 'admin@sucata.local'
union all
select id, 'Escritório', 'escritorio' from auth.users where email = 'escritorio@sucata.local'
union all
select id, 'Balança', 'balanca' from auth.users where email = 'balanca@sucata.local';
```

- [ ] **Step 5: Verificação manual ponta a ponta**

Run: `npm run dev`. No navegador:
1. Acesse `/` sem login → deve redirecionar pra `/login`.
2. Entre como `balanca@sucata.local` → cai em `/balanca`. Tente abrir `/escritorio` e `/` → é jogado de volta pra `/balanca`.
3. Entre como `escritorio@sucata.local` → acessa `/escritorio` e `/balanca`, mas `/` o manda pra `/escritorio`.
4. Entre como `admin@sucata.local` → acessa as três rotas.

Expected: todos os redirecionamentos conforme a regra `rotaPermitida`.

- [ ] **Step 6: Rodar a suíte completa**

Run: `npm test`
Expected: todos os testes (format, auth) PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: shell autenticado, páginas protegidas por papel e usuários de teste"
```

---

## Verificação final do Plano 1

- [ ] `npm test` → verde (format + auth).
- [ ] `npm run build` → sem erros.
- [ ] Login funciona para os 3 perfis e a guarda de rota respeita os papéis.
- [ ] `get_advisors(security)` no Supabase sem alerta de RLS desabilitado em `public.profiles`.

**Saída deste plano:** base sólida (auth + RLS + testes) pronta para receber os cadastros de
materiais e pessoas (Plano 2).
