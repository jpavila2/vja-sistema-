-- Migration: enable_realtime
-- Habilita o Realtime (postgres_changes) nas tabelas do operacional, pra que o
-- que um aparelho faz apareça nos outros em tempo real. Aplicar via MCP em 2026-06-09.
alter publication supabase_realtime add table
  public.purchases,
  public.purchase_items,
  public.sales,
  public.sale_items,
  public.cash_sessions,
  public.cash_movements,
  public.materials,
  public.stock_movements,
  public.people;
