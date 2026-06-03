-- Migration: precos_compra_quadro
-- Preços de COMPRA do quadro da porta (o que paga o catador).
-- (1) Atualiza preço de compra dos materiais existentes (só leituras nítidas) e
--     marca-os pra aparecer na balança. (2) Cria os materiais do quadro que não
--     existiam, como item de balança. Itens com preço borrado ficam em 0 pro
--     João preencher na tela de Materiais. Aplicar via MCP em 2026-06-03.

-- ── 1. Existentes: preço de compra nítido + visível na balança ────────────────
update public.materials set preco_compra = 6.00,  mostrar_balanca = true where nome = 'Alumínio Duro (Bloco)';
update public.materials set preco_compra = 10.00, mostrar_balanca = true where nome = 'Alumínio Perfil';
update public.materials set preco_compra = 9.00,  mostrar_balanca = true where nome = 'Perfil Pintado PF';
update public.materials set preco_compra = 10.00, mostrar_balanca = true where nome = 'Roda Alumínio';
update public.materials set preco_compra = 5.00,  mostrar_balanca = true where nome = 'Antimônio';
update public.materials set preco_compra = 2.00,  mostrar_balanca = true where nome = 'Celular';
update public.materials set preco_compra = 0.50,  mostrar_balanca = true where nome = 'Filme Branco';
update public.materials set preco_compra = 0.20,  mostrar_balanca = true where nome = 'Filme Colorido';
update public.materials set preco_compra = 6.00,  mostrar_balanca = true where nome = 'Magnésio';
update public.materials set preco_compra = 17.50, mostrar_balanca = true where nome = 'Motor Pequeno';
update public.materials set preco_compra = 35.00, mostrar_balanca = true where nome = 'Motor Grande';
update public.materials set preco_compra = 0.30,  mostrar_balanca = true where nome = 'Papelão';
update public.materials set preco_compra = 0.50,  mostrar_balanca = true where nome = 'Aço Panela';
update public.materials set preco_compra = 12.00, mostrar_balanca = true where nome = 'RCA';
update public.materials set preco_compra = 0.10,  mostrar_balanca = true where nome = 'Vidro';

-- ── 2. Existentes no quadro mas preço borrado: só garante visível na balança ──
update public.materials set mostrar_balanca = true
  where nome in ('Cobre 1ª','Cobre 2ª','Cobre 4ª','Metal','Panela Limpa PF','Latinha','PET','Sucata Pesada');

-- ── 3. Novos do quadro (item de balança; preço de venda 0 = definir depois) ───
insert into public.materials (nome, categoria, unidade, preco_compra, preco_venda, emoji, mostrar_balanca, mostrar_venda)
select v.nome, v.cat, 'kg', v.pc, 0, v.emoji, true, false from (values
  ('Chumbo','metal','⬛',5.00::numeric),
  ('Limalha Aço','metal','⚙️',2.00::numeric),
  ('Limalha Alumínio','metal','⚙️',2.00::numeric),
  ('Limalha Metal','metal','⚙️',10.00::numeric),
  ('Material de Limpeza','plastico','🧴',0.70::numeric),
  ('Arquivo','papel','📄',0.10::numeric),
  ('PET Óleo','plastico','🛢️',0.50::numeric),
  ('Placa Computador','eletronico','🟩',1.50::numeric),
  ('Pó Alumínio','metal','✨',2.00::numeric),
  ('Radiador de Alumínio','metal','🌡️',5.00::numeric),
  ('Radiador Metal','metal','🌡️',12.00::numeric),
  ('Raio X','outros','☢️',1.00::numeric),
  ('Óleo de Cozinha','outros','🍳',0.70::numeric),
  ('Aço','metal','⚙️',0.00::numeric),
  ('Estamparia','metal','⚙️',0.00::numeric),
  ('Plástico Duro','plastico','♻️',0.00::numeric)
) as v(nome,cat,emoji,pc)
where not exists (select 1 from public.materials m where m.nome = v.nome);
