-- Migration: catalogo_maio_flags
-- (1) Flags mostrar_balanca / mostrar_venda nos materiais.
-- (2) Preços de venda (última venda de maio) nos materiais existentes.
-- (3) Renomeia Cobre -> Cobre 1ª. (4) Insere materiais novos da planilha.
-- Projeto Supabase "sistema VJA". Aplicar via MCP em 2026-06-03.

alter table public.materials
  add column if not exists mostrar_balanca boolean not null default true,
  add column if not exists mostrar_venda   boolean not null default true;

-- Existentes: preço de venda + flags
update public.materials set preco_venda = 0.80, mostrar_balanca = true, mostrar_venda = true where nome = 'Papelão';
update public.materials set preco_venda = 4.00, mostrar_balanca = true, mostrar_venda = true where nome = 'PET';
update public.materials set preco_venda = 14.20, mostrar_balanca = true, mostrar_venda = true where nome = 'Latinha';
update public.materials set preco_venda = 4.10, mostrar_balanca = true, mostrar_venda = true where nome = 'Bateria';
update public.materials set preco_venda = 5.20, mostrar_balanca = true, mostrar_venda = true where nome = 'Inox';
update public.materials set preco_venda = 1.30, mostrar_balanca = true, mostrar_venda = true where nome = 'Sucata Pesada';
update public.materials set preco_venda = 0.95, mostrar_balanca = true, mostrar_venda = true where nome = 'Sucata (Misto)';
update public.materials set preco_venda = 9.80, mostrar_balanca = true, mostrar_venda = true where nome = 'Alumínio Duro (Bloco)';
update public.materials set preco_venda = 16.30, mostrar_balanca = false, mostrar_venda = true where nome = 'Alumínio Perfil';
update public.materials set nome = 'Cobre 1ª', preco_venda = 65.00, mostrar_balanca = true, mostrar_venda = true where nome = 'Cobre';
update public.materials set preco_venda = 3.05, mostrar_balanca = true, mostrar_venda = true where nome = 'Plástico';
update public.materials set preco_venda = 0.00, mostrar_balanca = true, mostrar_venda = true where nome = 'Alumínio';
update public.materials set preco_venda = 0.00, mostrar_balanca = true, mostrar_venda = false where nome = 'PP (Polipropileno)';
update public.materials set preco_venda = 0.00, mostrar_balanca = true, mostrar_venda = false where nome = 'Filme Plástico';

-- Novos materiais (preco_compra 0 = você define depois)
insert into public.materials (nome, categoria, unidade, preco_compra, preco_venda, emoji, mostrar_balanca, mostrar_venda)
select v.nome, v.cat, 'kg', 0, v.pv, v.emoji, v.bal, v.ven from (values
  ('Bronze','metal','🟫',47.00::numeric,true,true),
  ('Aço Panela','metal','🍳',1.20::numeric,true,true),
  ('Ferro Fundido','metal','🛠️',1.30::numeric,true,true),
  ('Sucata Miúda','metal','⛓️',1.30::numeric,true,true),
  ('Motor Grande','eletronico','⚙️',61.00::numeric,true,true),
  ('Motor Pequeno','eletronico','🔩',30.50::numeric,true,true),
  ('Garrafinha Colorida (PEAD)','plastico','🧴',2.50::numeric,true,true),
  ('Garrafinha Preta','plastico','🖤',2.50::numeric,true,true),
  ('Caixaria','papel','📦',4.40::numeric,true,true),
  ('Vidro','outros','🫙',0.25::numeric,true,true),
  ('Cobre 2ª','metal','🟧',62.00::numeric,false,true),
  ('Cobre 4ª','metal','🟧',38.00::numeric,false,true),
  ('Antimônio','metal','⚙️',12.70::numeric,false,true),
  ('Magnésio','metal','⚙️',12.00::numeric,false,true),
  ('Metal','metal','⚙️',36.00::numeric,false,true),
  ('Chaparia PF','metal','⚙️',12.00::numeric,false,true),
  ('Perfil Pintado PF','metal','⚙️',14.50::numeric,false,true),
  ('Lata PF','metal','🥫',13.80::numeric,false,true),
  ('Panela Limpa PF','metal','🍳',13.60::numeric,false,true),
  ('Estrutura Alumínio','metal','🪟',10.50::numeric,false,true),
  ('Roda Alumínio','metal','🛞',16.30::numeric,false,true),
  ('RCA','eletronico','🔌',31.00::numeric,false,true),
  ('Celular','eletronico','📱',40.00::numeric,false,true),
  ('HD','eletronico','💽',12.00::numeric,false,true),
  ('Notebook','eletronico','💻',8.00::numeric,false,true),
  ('Memória Dourada','eletronico','🟨',300.00::numeric,false,true),
  ('Processador','eletronico','🔲',70.00::numeric,false,true),
  ('Placa C','eletronico','🟩',50.00::numeric,false,true),
  ('Placa D','eletronico','🟩',25.00::numeric,false,true),
  ('Placa G','eletronico','🟩',55.00::numeric,false,true),
  ('Placa P','eletronico','🟩',18.00::numeric,false,true),
  ('Placa Marrom','eletronico','🟫',7.00::numeric,false,true),
  ('Placa Notebook','eletronico','🟩',55.00::numeric,false,true),
  ('PP Branco','plastico','⚪',3.20::numeric,false,true),
  ('PP Preto','plastico','⚫',2.00::numeric,false,true),
  ('PP Colorido','plastico','🔵',2.70::numeric,false,true),
  ('Garrafa Cristal','plastico','💧',4.20::numeric,false,true),
  ('Garrafa Verde','plastico','🟢',4.20::numeric,false,true),
  ('Filme Branco','plastico','🎞️',2.00::numeric,false,true),
  ('Filme Colorido','plastico','🎞️',0.80::numeric,false,true),
  ('Filme Cristal Mercado','plastico','🎞️',2.00::numeric,false,true)
) as v(nome,cat,emoji,pv,bal,ven)
where not exists (select 1 from public.materials m where m.nome = v.nome);
