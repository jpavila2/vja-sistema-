-- Migration: compras_estoque
-- purchases, purchase_items, stock_movements + função transacional registrar_compra.
-- registrar_compra é SECURITY DEFINER (em public, p/ supabase.rpc), com checagem interna
-- de auth.uid()+perfil; revogada de anon. Projeto "sistema VJA". Aplicada via MCP 2026-05-31.

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

alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.stock_movements enable row level security;

create policy purchases_read on public.purchases for select to authenticated using (true);
create policy purchase_items_read on public.purchase_items for select to authenticated using (true);
create policy stock_movements_read on public.stock_movements for select to authenticated using (true);

create policy purchases_update on public.purchases for update to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));

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
