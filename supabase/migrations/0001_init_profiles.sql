-- Migration: init_profiles
-- Tabela de perfis ligada ao Supabase Auth + RLS por papel.
-- Aplicada no projeto Supabase "sistema VJA" (org Sucata) via MCP em 2026-05-30.

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
