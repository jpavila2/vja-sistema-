-- Migration: venda sem trava de estoque
-- Remove a checagem "estoque insuficiente" de registrar_venda.
-- Motivo: o estoque começa a ser gerado agora (não há saldo inicial cadastrado),
-- então toda venda batia na trava. O estoque pode ficar negativo até as compras
-- correspondentes serem lançadas. Para reativar a trava no futuro, basta recriar
-- a função com a checagem v_estoque < v_peso.

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

    -- (trava de estoque removida — estoque pode ficar negativo)

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
