-- Migration: excluir_venda
-- Exclui DE VEZ uma venda (hard delete): devolve ao estoque os itens (se a venda
-- ainda não estava cancelada, porque cancelar_venda já devolveu), apaga os
-- movimentos de estoque, os itens e a venda. Espelha excluir_compra (0020).
-- SECURITY DEFINER com checagem de papel (admin/escritorio), revogada de anon.
-- Projeto "sistema VJA".

create or replace function public.excluir_venda(p_id bigint)
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
  select papel into v_papel from public.profiles where id = v_uid and ativo = true;
  if v_papel not in ('admin','escritorio') then raise exception 'sem permissão'; end if;

  select status into v_status from public.sales where id = p_id for update;
  if v_status is null then raise exception 'venda não encontrada'; end if;

  -- devolve o estoque só se ainda não estava cancelada (cancelada já devolveu)
  if v_status <> 'cancelada' then
    for v_item in select material_id, peso from public.sale_items where sale_id = p_id loop
      update public.materials set estoque_atual = estoque_atual + v_item.peso
        where id = v_item.material_id;
    end loop;
  end if;

  delete from public.stock_movements
    where sale_item_id in (select id from public.sale_items where sale_id = p_id);
  delete from public.sale_items where sale_id = p_id;
  delete from public.sales where id = p_id;
end;
$$;

revoke execute on function public.excluir_venda(bigint) from public, anon;
grant execute on function public.excluir_venda(bigint) to authenticated;
