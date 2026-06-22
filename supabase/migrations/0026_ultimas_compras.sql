-- Migration: ultimas_compras
-- A balança não lê purchases direto (RLS protege o financeiro). Este RPC
-- SECURITY DEFINER devolve as últimas compras (de QUALQUER aparelho) com itens,
-- para o painel "Últimas compras" da balança. Decisão do dono: o operador pode
-- ver as compras recentes. Projeto "sistema VJA".

create or replace function public.ultimas_compras(p_limite int default 40)
returns jsonb
language sql security definer set search_path = '' stable as $$
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.quando desc), '[]'::jsonb)
  from (
    select
      p.id,
      p.data_hora as quando,
      coalesce(pe.nome, 'Avulso') as catador,
      p.total,
      p.forma_pagamento,
      p.status,
      p.client_request_id,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'nome', m.nome, 'emoji', m.emoji, 'unidade', m.unidade,
          'peso', pi.peso_liquido, 'preco', pi.preco_unitario, 'subtotal', pi.subtotal)), '[]'::jsonb)
        from public.purchase_items pi
        join public.materials m on m.id = pi.material_id
        where pi.purchase_id = p.id
      ) as itens
    from public.purchases p
    left join public.people pe on pe.id = p.pessoa_id
    order by p.data_hora desc
    limit greatest(1, least(p_limite, 100))
  ) x;
$$;

revoke execute on function public.ultimas_compras(int) from public, anon;
grant execute on function public.ultimas_compras(int) to authenticated;
