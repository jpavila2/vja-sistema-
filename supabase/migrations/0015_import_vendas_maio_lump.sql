-- Migration: import_vendas_maio_lump
-- As 8 linhas de maio que estavam SEM material na planilha (não entraram no
-- 0013). Sem elas o faturamento dava 566.100,02; com elas fecha em 710.282,37
-- (= TOTAL RECEITAS da planilha). Materiais deduzidos por preço/cliente:
--   JAIRO/CIRTEL 0,95 -> Sucata (Misto); CIRTEL 1,25 -> Sucata Miúda;
--   COBREMAX (valores fechados, sem peso) -> Cobre 1ª, peso estimado pelo valor;
--   ZÉ GORDO R$2009 (sem detalhe) -> Placa Computador. Ajustável depois.
-- Não altera estoque. Aplicar via MCP em 2026-06-03.

create temp table _imp2 (data date, cliente text, material text, peso numeric, preco numeric, subtotal numeric) on commit drop;
insert into _imp2 values
 ('2026-05-06','JAIRO','Sucata (Misto)',3880,0.95,3686.00),
 ('2026-05-19','Cobremax','Cobre 1ª',728.137,65,47328.90),
 ('2026-05-26','Cobremax','Cobre 1ª',642.078,65,41735.10),
 ('2026-05-26','CIRTEL','Sucata (Misto)',4740,0.95,4503.00),
 ('2026-05-27','ZÉ GORDO','Placa Computador',1,2009,2009.00),
 ('2026-05-29','Cobremax','Cobre 1ª',637.654,65,41447.50),
 ('2026-05-29','CIRTEL','Sucata Miúda',800,1.25,1000.00),
 ('2026-05-30','JAIRO','Sucata (Misto)',2603,0.95,2472.85);

insert into public.people (nome, tipo)
  select distinct cliente,'cliente' from _imp2 i
  where not exists (select 1 from public.people p where p.nome=i.cliente);

do $$
declare g record; v_sale bigint;
begin
  for g in select data, cliente, material, peso, preco, subtotal from _imp2 loop
    insert into public.sales (pessoa_id, operador_id, data_hora, total, forma_pagamento, status, observacoes)
    select p.id,'c020deda-1678-4007-a522-842edef1d4ca'::uuid,
      ((g.data::text||' 12:00:00-03:00')::timestamptz), g.subtotal,'pix','ativa','Import planilha MAIO (lump)'
    from public.people p where p.nome=g.cliente order by p.id limit 1
    returning id into v_sale;
    insert into public.sale_items (sale_id, material_id, peso, preco_unitario, subtotal)
    select v_sale, m.id, g.peso, g.preco, g.subtotal from public.materials m where m.nome=g.material limit 1;
  end loop;
end $$;
