-- Migration: editar_compra
-- Edita uma compra (antes ou depois da conferência, exceto cancelada):
-- estorna o estoque dos itens atuais, regrava os novos itens + entrada de estoque,
-- recalcula o total e troca a forma de pagamento. Mantém o status (registra updated_at).
-- SECURITY DEFINER com checagem de papel (admin/escritorio), revogada de anon.
-- Projeto "sistema VJA". Aplicar via MCP em 2026-06-08.

create or replace function public.editar_compra(
  p_id bigint,
  p_forma_pagamento text,
  p_itens jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_papel text;
  v_status text;
  v_forma text;
  v_item record;
  v_new jsonb;
  v_item_id bigint;
  v_peso_liq numeric(10,3);
  v_peso_bruto numeric(10,3);
  v_preco numeric(12,2);
  v_subtotal numeric(12,2);
  v_total numeric(12,2) := 0;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid;
  if v_papel not in ('admin','escritorio') then raise exception 'sem permissão'; end if;

  v_forma := case when p_forma_pagamento = 'pix' then 'pix' else 'dinheiro' end;

  select status into v_status from public.purchases where id = p_id for update;
  if v_status is null then raise exception 'compra não encontrada'; end if;
  if v_status = 'cancelada' then raise exception 'compra cancelada não pode ser editada'; end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'a compra precisa de ao menos um item';
  end if;

  -- 1) estorna o estoque dos itens atuais e remove movimentos + itens
  for v_item in select id, material_id, peso_liquido from public.purchase_items where purchase_id = p_id loop
    update public.materials set estoque_atual = estoque_atual - v_item.peso_liquido
      where id = v_item.material_id;
  end loop;
  delete from public.stock_movements
    where purchase_item_id in (select id from public.purchase_items where purchase_id = p_id);
  delete from public.purchase_items where purchase_id = p_id;

  -- 2) grava os novos itens + entrada de estoque
  for v_new in select * from jsonb_array_elements(p_itens) loop
    v_peso_liq := (v_new->>'peso_liquido')::numeric;
    v_peso_bruto := coalesce((v_new->>'peso_bruto')::numeric, v_peso_liq);
    v_preco := (v_new->>'preco_unitario')::numeric;
    if v_peso_liq is null or v_peso_liq <= 0 then raise exception 'peso inválido'; end if;
    if v_preco is null or v_preco < 0 then raise exception 'preço inválido'; end if;
    v_subtotal := round(v_peso_liq * v_preco, 2);

    insert into public.purchase_items
      (purchase_id, material_id, peso_bruto, peso_liquido, preco_unitario, subtotal)
    values
      (p_id, (v_new->>'material_id')::bigint, v_peso_bruto, v_peso_liq, v_preco, v_subtotal)
    returning id into v_item_id;

    insert into public.stock_movements
      (material_id, tipo, quantidade, purchase_item_id, motivo, created_by)
    values
      ((v_new->>'material_id')::bigint, 'entrada_compra', v_peso_liq, v_item_id, 'edição da compra', v_uid);

    update public.materials set estoque_atual = estoque_atual + v_peso_liq
      where id = (v_new->>'material_id')::bigint;

    v_total := v_total + v_subtotal;
  end loop;

  -- 3) recalcula total e troca forma de pagamento (mantém status)
  update public.purchases
    set total = v_total, forma_pagamento = v_forma, updated_at = now()
    where id = p_id;
end;
$$;

revoke execute on function public.editar_compra(bigint, text, jsonb) from public, anon;
grant execute on function public.editar_compra(bigint, text, jsonb) to authenticated;
