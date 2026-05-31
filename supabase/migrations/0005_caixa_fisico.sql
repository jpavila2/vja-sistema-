-- Migration: caixa_fisico
-- (1) semente "Avulso"; (2) registrar_compra agora aceita telefone do catador (cadastro rápido);
-- (3) caixa físico: cash_sessions + cash_movements com RLS só admin/escritório.
-- Projeto "sistema VJA". Aplicada via MCP 2026-05-31.

insert into public.people (nome, tipo)
select 'Avulso', 'fornecedor'
where not exists (select 1 from public.people where nome = 'Avulso' and tipo = 'fornecedor');

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

create policy cash_sessions_rw on public.cash_sessions for all to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));
create policy cash_movements_rw on public.cash_movements for all to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));
