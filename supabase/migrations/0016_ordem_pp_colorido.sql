-- Migration: ordem_pp_colorido
-- PP Colorido = "plástico pintado" do João; entra após os 14 principais da
-- balança e passa a aparecer nela. Aplicar via MCP em 2026-06-03.
update public.materials set ordem_balanca = 15, mostrar_balanca = true where nome = 'PP Colorido';
