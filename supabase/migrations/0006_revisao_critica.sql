-- Migration: revisao_critica
-- Correções dos achados 🔴/🟠 da revisão (2026-06-03):
--  C1: balança NÃO pode ler financeiro -> leitura de purchases/itens/estoque só admin/escritório.
--  C2: idempotência -> coluna client_request_id (unique) + registrar_compra "on conflict do nothing".
--  C3: CHECKs de não-negatividade em purchase_items + revalidação dentro de registrar_compra.
--  Hardening: user_role() ignora usuário inativo; revoga grants amplos de anon; revoga rls_auto_enable.
-- Projeto "sistema VJA". Aplicada via MCP 2026-06-03.

-- ── C1: leitura financeira restrita a admin/escritório ───────────────────────
drop policy if exists purchases_read on public.purchases;
create policy purchases_read on public.purchases for select to authenticated
  using ((select private.user_role()) in ('admin','escritorio'));

drop policy if exists purchase_items_read on public.purchase_items;
create policy purchase_items_read on public.purchase_items for select to authenticated
  using ((select private.user_role()) in ('admin','escritorio'));

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements for select to authenticated
  using ((select private.user_role()) in ('admin','escritorio'));

-- ── C3: integridade dos itens (não-negatividade e líquido <= bruto) ──────────
alter table public.purchase_items
  add constraint purchase_items_peso_bruto_pos  check (peso_bruto > 0),
  add constraint purchase_items_peso_liq_pos    check (peso_liquido > 0),
  add constraint purchase_items_liq_lte_bruto   check (peso_liquido <= peso_bruto),
  add constraint purchase_items_preco_nonneg    check (preco_unitario >= 0),
  add constraint purchase_items_subtotal_nonneg check (subtotal >= 0);

-- ── C2: idempotência da compra (evita duplicar em duplo-clique/retry) ────────
alter table public.purchases add column if not exists client_request_id uuid;
create unique index if not exists purchases_client_req_uidx
  on public.purchases (client_request_id);

-- ── C2+C3: registrar_compra com idempotência e revalidação por item ──────────
drop function if exists public.registrar_compra(bigint, text, text, text, jsonb);
create or replace function public.registrar_compra(
  p_pessoa_id bigint,
  p_catador_nome text,
  p_catador_telefone text,
  p_observacoes text,
  p_itens jsonb,
  p_client_request_id uuid default null
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
  v_peso_bruto numeric(10,3);
  v_peso_liq numeric(10,3);
  v_preco numeric(12,2);
  v_subtotal numeric(12,2);
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid and ativo = true;
  if v_papel is null then raise exception 'usuário sem perfil ou inativo'; end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'compra sem itens';
  end if;

  -- idempotência: se já existe compra com este request id, devolve a existente
  if p_client_request_id is not null then
    select id into v_compra_id from public.purchases where client_request_id = p_client_request_id;
    if v_compra_id is not null then return v_compra_id; end if;
  end if;

  if v_pessoa_id is null then
    if coalesce(btrim(p_catador_nome), '') = '' then raise exception 'informe o catador'; end if;
    insert into public.people (nome, tipo, telefone)
    values (btrim(p_catador_nome), 'fornecedor', nullif(btrim(coalesce(p_catador_telefone,'')), ''))
    returning id into v_pessoa_id;
  end if;

  insert into public.purchases (pessoa_id, operador_id, total, forma_pagamento, status, observacoes, client_request_id)
  values (v_pessoa_id, v_uid, 0, 'dinheiro', 'pendente', nullif(btrim(coalesce(p_observacoes,'')), ''), p_client_request_id)
  on conflict (client_request_id) do nothing
  returning id into v_compra_id;

  -- corrida: outro request idêntico inseriu primeiro -> devolve a existente
  if v_compra_id is null then
    select id into v_compra_id from public.purchases where client_request_id = p_client_request_id;
    return v_compra_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_peso_bruto := (v_item->>'peso_bruto')::numeric;
    v_peso_liq   := (v_item->>'peso_liquido')::numeric;
    v_preco      := (v_item->>'preco_unitario')::numeric;
    if v_peso_bruto <= 0 then raise exception 'peso bruto inválido'; end if;
    if v_peso_liq <= 0 then raise exception 'peso líquido inválido'; end if;
    if v_peso_liq > v_peso_bruto then raise exception 'peso líquido maior que o bruto'; end if;
    if v_preco < 0 then raise exception 'preço inválido'; end if;
    v_subtotal := round(v_peso_liq * v_preco, 2);

    insert into public.purchase_items (purchase_id, material_id, peso_bruto, peso_liquido, preco_unitario, subtotal)
    values (v_compra_id, (v_item->>'material_id')::bigint, v_peso_bruto, v_peso_liq, v_preco, v_subtotal)
    returning id into v_item_id;

    insert into public.stock_movements (material_id, tipo, quantidade, purchase_item_id, motivo, created_by)
    values ((v_item->>'material_id')::bigint, 'entrada_compra', v_peso_liq, v_item_id, 'compra', v_uid);

    update public.materials set estoque_atual = estoque_atual + v_peso_liq
      where id = (v_item->>'material_id')::bigint;

    v_total := v_total + v_subtotal;
  end loop;

  update public.purchases set total = v_total where id = v_compra_id;
  return v_compra_id;
end; $$;
revoke execute on function public.registrar_compra(bigint, text, text, text, jsonb, uuid) from public, anon;
grant  execute on function public.registrar_compra(bigint, text, text, text, jsonb, uuid) to authenticated;

-- ── Hardening de segurança ───────────────────────────────────────────────────
-- user_role() passa a ignorar usuário inativo (desativar revoga acesso via RLS).
create or replace function private.user_role() returns text
language sql stable security definer set search_path = '' as $$
  select papel from public.profiles where id = (select auth.uid()) and ativo = true;
$$;

-- App nunca usa o papel anon nas tabelas públicas; remover a superfície.
revoke all on all tables in schema public from anon;

-- Função pré-existente (não é do app) não deve ser chamável via API.
do $$ begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable' and pronamespace = 'public'::regnamespace) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated, public';
  end if;
end $$;
