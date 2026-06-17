-- Migration: editar_venda
-- Edita os itens de uma venda (exceto cancelada): devolve ao estoque os itens
-- atuais, regrava os novos itens com a saída de estoque, recalcula o total e
-- troca a forma de pagamento. Espelha editar_compra. Sem trava de estoque
-- (consistente com a remoção em registrar_venda). Projeto "sistema VJA".

create or replace function public.editar_venda(
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
  v_peso numeric(10,3);
  v_preco numeric(12,2);
  v_subtotal numeric(12,2);
  v_total numeric(12,2) := 0;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid and ativo = true;
  if v_papel not in ('admin','escritorio') then raise exception 'sem permissão'; end if;

  if p_forma_pagamento not in ('dinheiro','pix','transferencia','boleto','cheque') then
    raise exception 'forma de pagamento inválida';
  end if;
  v_forma := p_forma_pagamento;

  select status into v_status from public.sales where id = p_id for update;
  if v_status is null then raise exception 'venda não encontrada'; end if;
  if v_status = 'cancelada' then raise exception 'venda cancelada não pode ser editada'; end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'a venda precisa de ao menos um item';
  end if;

  -- 1) devolve ao estoque os itens atuais (venda estorna), remove movimentos + itens
  for v_item in select id, material_id, peso from public.sale_items where sale_id = p_id loop
    update public.materials set estoque_atual = estoque_atual + v_item.peso
      where id = v_item.material_id;
  end loop;
  delete from public.stock_movements
    where sale_item_id in (select id from public.sale_items where sale_id = p_id);
  delete from public.sale_items where sale_id = p_id;

  -- 2) grava os novos itens + saída de estoque (sem trava de estoque)
  for v_new in select * from jsonb_array_elements(p_itens) loop
    v_peso := (v_new->>'peso')::numeric;
    v_preco := (v_new->>'preco_unitario')::numeric;
    if v_peso is null or v_peso <= 0 then raise exception 'peso inválido'; end if;
    if v_preco is null or v_preco < 0 then raise exception 'preço inválido'; end if;
    v_subtotal := round(v_peso * v_preco, 2);

    insert into public.sale_items (sale_id, material_id, peso, preco_unitario, subtotal)
    values (p_id, (v_new->>'material_id')::bigint, v_peso, v_preco, v_subtotal)
    returning id into v_item_id;

    insert into public.stock_movements
      (material_id, tipo, quantidade, sale_item_id, motivo, created_by)
    values
      ((v_new->>'material_id')::bigint, 'saida_venda', v_peso, v_item_id, 'edição da venda', v_uid);

    update public.materials set estoque_atual = estoque_atual - v_peso
      where id = (v_new->>'material_id')::bigint;

    v_total := v_total + v_subtotal;
  end loop;

  -- 3) recalcula total e troca forma de pagamento (updated_at via trigger)
  update public.sales set total = v_total, forma_pagamento = v_forma where id = p_id;
end;
$$;

revoke execute on function public.editar_venda(bigint, text, jsonb) from public, anon;
grant execute on function public.editar_venda(bigint, text, jsonb) to authenticated;
