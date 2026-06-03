-- Migration: vendas
-- (1) preco_venda em materials; (2) novos materiais + compradores seeds;
-- (3) stock_movements: novos tipos + sale_item_id; (4) sales + sale_items;
-- (5) registrar_venda + cancelar_venda (SECURITY DEFINER);
-- (6) cash_sessions: colunas saldo_calculado + diferenca (gravadas no fechamento).
-- Projeto "sistema VJA". Aplique via MCP em 2026-06-03.

-- ── 1. preco_venda em materials ────────────────────────────────────────────────
alter table public.materials
  add column if not exists preco_venda numeric(12,2) not null default 0;

-- ── 2. Expandir tipos de stock_movements ──────────────────────────────────────
alter table public.stock_movements
  drop constraint if exists stock_movements_tipo_check;
alter table public.stock_movements
  add constraint stock_movements_tipo_check
    check (tipo in ('entrada_compra','ajuste','estorno','saida_venda','estorno_venda'));

alter table public.stock_movements
  add column if not exists sale_item_id bigint;

-- ── 3. Tabelas sales + sale_items ─────────────────────────────────────────────
create table if not exists public.sales (
  id            bigint generated always as identity primary key,
  pessoa_id     bigint not null references public.people(id),
  operador_id   uuid   not null references public.profiles(id),
  data_hora     timestamptz not null default now(),
  total         numeric(12,2) not null default 0 check (total >= 0),
  forma_pagamento text not null default 'pix'
    check (forma_pagamento in ('dinheiro','pix','transferencia','boleto','cheque')),
  status        text not null default 'ativa' check (status in ('ativa','cancelada')),
  motivo_cancelamento text,
  observacoes   text,
  client_request_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists sales_client_req_uidx
  on public.sales (client_request_id);
create index if not exists sales_pessoa_idx  on public.sales (pessoa_id);
create index if not exists sales_data_idx   on public.sales (data_hora);
create index if not exists sales_status_idx on public.sales (status);
create trigger sales_set_updated before update on public.sales
  for each row execute function public.set_updated_at();

create table if not exists public.sale_items (
  id            bigint generated always as identity primary key,
  sale_id       bigint not null references public.sales(id) on delete cascade,
  material_id   bigint not null references public.materials(id),
  peso          numeric(10,3) not null check (peso > 0),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  subtotal      numeric(12,2) not null check (subtotal >= 0)
);
create index if not exists sale_items_sale_idx     on public.sale_items (sale_id);
create index if not exists sale_items_material_idx on public.sale_items (material_id);

alter table public.sales       enable row level security;
alter table public.sale_items  enable row level security;

create policy sales_read on public.sales for select to authenticated
  using ((select private.user_role()) in ('admin','escritorio'));
create policy sale_items_read on public.sale_items for select to authenticated
  using ((select private.user_role()) in ('admin','escritorio'));
create policy sales_update on public.sales for update to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));

-- ── 4. cash_sessions: registrar diferença no fechamento ───────────────────────
alter table public.cash_sessions
  add column if not exists saldo_calculado numeric(12,2),
  add column if not exists diferenca       numeric(12,2);

-- ── 5. registrar_venda ────────────────────────────────────────────────────────
create or replace function public.registrar_venda(
  p_pessoa_id           bigint,
  p_observacoes         text,
  p_forma_pagamento     text,
  p_itens               jsonb,
  p_client_request_id   uuid default null
) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid         uuid := (select auth.uid());
  v_papel       text;
  v_venda_id    bigint;
  v_total       numeric(12,2) := 0;
  v_item        jsonb;
  v_item_id     bigint;
  v_material_id bigint;
  v_peso        numeric(10,3);
  v_preco       numeric(12,2);
  v_subtotal    numeric(12,2);
  v_estoque     numeric(12,3);
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid and ativo = true;
  if v_papel not in ('admin','escritorio') then
    raise exception 'sem permissão para registrar vendas';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'venda sem itens';
  end if;
  if p_forma_pagamento not in ('dinheiro','pix','transferencia','boleto','cheque') then
    raise exception 'forma de pagamento inválida';
  end if;

  -- idempotência
  if p_client_request_id is not null then
    select id into v_venda_id from public.sales where client_request_id = p_client_request_id;
    if v_venda_id is not null then return v_venda_id; end if;
  end if;

  insert into public.sales
    (pessoa_id, operador_id, total, forma_pagamento, status, observacoes, client_request_id)
  values
    (p_pessoa_id, v_uid, 0, p_forma_pagamento, 'ativa',
     nullif(btrim(coalesce(p_observacoes,'')), ''), p_client_request_id)
  on conflict (client_request_id) do nothing
  returning id into v_venda_id;

  if v_venda_id is null then
    select id into v_venda_id from public.sales where client_request_id = p_client_request_id;
    return v_venda_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_material_id := (v_item->>'material_id')::bigint;
    v_peso        := (v_item->>'peso')::numeric;
    v_preco       := (v_item->>'preco_unitario')::numeric;
    if v_peso <= 0 then raise exception 'peso inválido'; end if;
    if v_preco < 0 then raise exception 'preço inválido'; end if;
    v_subtotal    := round(v_peso * v_preco, 2);

    select estoque_atual into v_estoque from public.materials where id = v_material_id;
    if v_estoque < v_peso then
      raise exception 'estoque insuficiente para o material selecionado';
    end if;

    insert into public.sale_items (sale_id, material_id, peso, preco_unitario, subtotal)
    values (v_venda_id, v_material_id, v_peso, v_preco, v_subtotal)
    returning id into v_item_id;

    insert into public.stock_movements
      (material_id, tipo, quantidade, sale_item_id, motivo, created_by)
    values
      (v_material_id, 'saida_venda', v_peso, v_item_id, 'venda', v_uid);

    update public.materials
      set estoque_atual = estoque_atual - v_peso
      where id = v_material_id;

    v_total := v_total + v_subtotal;
  end loop;

  update public.sales set total = v_total where id = v_venda_id;
  return v_venda_id;
end;
$$;

revoke execute on function public.registrar_venda(bigint, text, text, jsonb, uuid) from public, anon;
grant  execute on function public.registrar_venda(bigint, text, text, jsonb, uuid) to authenticated;

-- ── 6. cancelar_venda ─────────────────────────────────────────────────────────
create or replace function public.cancelar_venda(
  p_venda_id bigint,
  p_motivo   text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_papel  text;
  v_status text;
  v_item   record;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid and ativo = true;
  if v_papel not in ('admin','escritorio') then
    raise exception 'sem permissão para cancelar vendas';
  end if;

  select status into v_status from public.sales where id = p_venda_id;
  if v_status is null   then raise exception 'venda não encontrada'; end if;
  if v_status = 'cancelada' then raise exception 'venda já foi cancelada'; end if;

  for v_item in
    select si.id, si.material_id, si.peso
    from public.sale_items si where si.sale_id = p_venda_id
  loop
    insert into public.stock_movements
      (material_id, tipo, quantidade, sale_item_id, motivo, created_by)
    values
      (v_item.material_id, 'estorno_venda', v_item.peso, v_item.id,
       'cancelamento de venda', v_uid);

    update public.materials
      set estoque_atual = estoque_atual + v_item.peso
      where id = v_item.material_id;
  end loop;

  update public.sales
    set status = 'cancelada',
        motivo_cancelamento = nullif(btrim(coalesce(p_motivo,'')), '')
    where id = p_venda_id;
end;
$$;

revoke execute on function public.cancelar_venda(bigint, text) from public, anon;
grant  execute on function public.cancelar_venda(bigint, text) to authenticated;

-- ── 7. Seeds: novos materiais ─────────────────────────────────────────────────
insert into public.materials (nome, categoria, unidade, preco_compra, preco_venda, emoji) values
  ('Alumínio Perfil',     'metal',    'kg', 4.50, 0.00, '🔧'),
  ('Alumínio Duro (Bloco)', 'metal',  'kg', 5.00, 0.00, '🧱'),
  ('Lata Enfardada',      'metal',    'kg', 2.50, 0.00, '🥫'),
  ('Sucata (Misto)',      'metal',    'kg', 0.70, 0.00, '⛏️'),
  ('PP (Polipropileno)', 'plastico', 'kg', 1.80, 0.00, '🧴'),
  ('Filme Plástico',     'plastico', 'kg', 0.60, 0.00, '🎞️');

-- ── 8. Seeds: compradores ─────────────────────────────────────────────────────
insert into public.people (nome, tipo) values
  ('Cobremax', 'cliente'),
  ('Novo Rio',  'cliente'),
  ('Ribeiro',   'cliente'),
  ('CRR',       'cliente')
on conflict do nothing;
