-- Migration: excluir_compra
-- Exclui DE VEZ uma compra (hard delete): estorna o estoque dos itens (se a compra
-- ainda não estava cancelada), apaga os movimentos de estoque, os itens e a compra.
-- SECURITY DEFINER com checagem de papel (admin/escritorio), revogada de anon.
-- Projeto "sistema VJA". Aplicar via MCP em 2026-06-09.

create or replace function public.excluir_compra(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_papel text;
  v_status text;
  v_item record;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid;
  if v_papel not in ('admin','escritorio') then raise exception 'sem permissão'; end if;

  select status into v_status from public.purchases where id = p_id for update;
  if v_status is null then raise exception 'compra não encontrada'; end if;

  -- estorna o estoque só se ainda não estava cancelada (cancelada já devolveu)
  if v_status <> 'cancelada' then
    for v_item in select material_id, peso_liquido from public.purchase_items where purchase_id = p_id loop
      update public.materials set estoque_atual = estoque_atual - v_item.peso_liquido
        where id = v_item.material_id;
    end loop;
  end if;

  delete from public.stock_movements
    where purchase_item_id in (select id from public.purchase_items where purchase_id = p_id);
  delete from public.purchase_items where purchase_id = p_id;
  delete from public.purchases where id = p_id;
end;
$$;

revoke execute on function public.excluir_compra(bigint) from public, anon;
grant execute on function public.excluir_compra(bigint) to authenticated;
