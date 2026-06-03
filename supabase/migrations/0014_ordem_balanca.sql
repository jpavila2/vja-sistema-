-- Migration: ordem_balanca
-- Ordem de exibição dos materiais na balança (os mais comprados primeiro).
-- ordem_balanca menor = aparece antes. Default 100 (não citados ficam depois,
-- ordenados por nome). Aplicar via MCP em 2026-06-03.

alter table public.materials
  add column if not exists ordem_balanca int not null default 100;

update public.materials set ordem_balanca = 1  where nome = 'Papelão';
update public.materials set ordem_balanca = 2  where nome = 'Sucata Pesada';      -- ferro
update public.materials set ordem_balanca = 3  where nome = 'Plástico Duro';
update public.materials set ordem_balanca = 4  where nome = 'Latinha';
update public.materials set ordem_balanca = 5  where nome = 'PET';
update public.materials set ordem_balanca = 6  where nome = 'Vidro';
update public.materials set ordem_balanca = 7  where nome = 'Aço';
update public.materials set ordem_balanca = 8  where nome = 'Cobre 1ª';            -- cobre
update public.materials set ordem_balanca = 9  where nome = 'Estamparia';
update public.materials set ordem_balanca = 10 where nome = 'Alumínio Duro (Bloco)';
update public.materials set ordem_balanca = 11 where nome = 'Metal';
update public.materials set ordem_balanca = 12 where nome = 'Radiador de Alumínio'; -- radiador/rca
update public.materials set ordem_balanca = 13 where nome = 'Radiador Metal';
update public.materials set ordem_balanca = 14 where nome = 'RCA';
