-- Migration: contas_a_receber
-- recebido=true por padrão (paga na hora); vendas a prazo ficam false até a
-- baixa na tela de Contas a receber. Aplicar via MCP em 2026-06-03.
alter table public.sales
  add column if not exists recebido boolean not null default true,
  add column if not exists recebido_em timestamptz;

create index if not exists sales_recebido_idx on public.sales (recebido) where recebido = false;
