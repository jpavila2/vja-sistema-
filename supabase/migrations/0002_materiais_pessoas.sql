-- Migration: materiais_pessoas
-- Tabelas materials e people com RLS (leitura p/ logados; escrita só admin/escritorio),
-- trigger de updated_at e seeds. Projeto Supabase "sistema VJA" (org Sucata).
-- Aplicada via MCP em 2026-05-30.

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
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
