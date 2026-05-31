-- Migration: cancelar_compra
-- Cancela uma compra (soft delete): marca status='cancelada', estorna o estoque de cada item
-- e registra movimentos 'estorno'. SECURITY DEFINER com checagem de papel (admin/escritorio),
-- revogada de anon. Projeto "sistema VJA". Aplicada via MCP 2026-05-31.

create or replace function public.cancelar_compra(p_id bigint, p_motivo text)
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
  if v_status = 'cancelada' then raise exception 'compra já cancelada'; end if;

  for v_item in select id, material_id, peso_liquido from public.purchase_items where purchase_id = p_id
  loop
    update public.materials set estoque_atual = estoque_atual - v_item.peso_liquido
      where id = v_item.material_id;
    insert into public.stock_movements (material_id, tipo, quantidade, purchase_item_id, motivo, created_by)
    values (v_item.material_id, 'estorno', -v_item.peso_liquido, v_item.id, 'cancelamento da compra', v_uid);
  end loop;

  update public.purchases
    set status = 'cancelada', motivo_cancelamento = nullif(btrim(coalesce(p_motivo,'')), '')
    where id = p_id;
end;
$$;

revoke execute on function public.cancelar_compra(bigint, text) from public, anon;
grant execute on function public.cancelar_compra(bigint, text) to authenticated;
