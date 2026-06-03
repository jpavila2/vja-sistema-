-- Migration: materiais_compradores
-- (1) Renomeia materiais: Ferro -> Sucata Pesada; Lata Enfardada -> Latinha.
-- (2) Cadastra novos compradores (locais de venda) com a especialidade em
--     observacoes; atualiza observacao do CRR (já existente).
-- Novos materiais (Caixaria, Garrafinhas) e preços de venda virão da planilha
-- de vendas de maio — entram numa migração posterior.
-- Projeto Supabase "sistema VJA". Aplicar via MCP em 2026-06-03.

-- ── 1. Renomear materiais ─────────────────────────────────────────────────────
update public.materials set nome = 'Sucata Pesada' where nome = 'Ferro';
update public.materials set nome = 'Latinha'        where nome = 'Lata Enfardada';

-- ── 2. Compradores / locais de venda ──────────────────────────────────────────
-- CRR já existe: só registrar a especialidade.
update public.people
  set observacoes = 'Papelão, PET e outros'
  where nome = 'CRR' and tipo = 'cliente';

insert into public.people (nome, tipo, observacoes)
select v.nome, 'cliente', v.obs
from (values
  ('CIRTEL',       'Sucata pesada e mista'),
  ('Metal Pronto', 'Sucata pesada e mista'),
  ('CPR',          'Plásticos')
) as v(nome, obs)
where not exists (
  select 1 from public.people p where p.nome = v.nome
);
