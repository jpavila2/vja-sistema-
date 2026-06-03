-- Migration: precos_compra_quadro_2
-- Preços de compra que faltavam (passados pelo João após releitura do quadro).
-- Metal = 22,00 (João escreveu 20 e depois 22; usado o 22). Cobre 4ª sem preço
-- de porta. Aplicar via MCP em 2026-06-03.

update public.materials set preco_compra = 8.00  where nome = 'Estamparia';
update public.materials set preco_compra = 45.00 where nome = 'Cobre 2ª';
update public.materials set preco_compra = 8.00  where nome = 'Panela Limpa PF';
update public.materials set preco_compra = 1.00  where nome = 'Plástico Duro';
update public.materials set preco_compra = 4.00  where nome = 'Aço';
update public.materials set preco_compra = 22.00 where nome = 'Metal';
