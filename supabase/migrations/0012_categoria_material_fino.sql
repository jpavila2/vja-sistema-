-- Migration: categoria_material_fino
-- Nova categoria 'material_fino' (não-ferrosos: cobre, alumínio, bronze, inox,
-- latinha, chumbo, metal...). Ferro/sucata pesada continuam 'metal'.
-- Itens ambíguos podem ser reclassificados na tela de Materiais. Aplicar via MCP.

alter table public.materials drop constraint if exists materials_categoria_check;
alter table public.materials add constraint materials_categoria_check
  check (categoria in ('metal','material_fino','plastico','papel','eletronico','outros'));

update public.materials set categoria = 'material_fino'
where nome in (
  'Alumínio','Alumínio Duro (Bloco)','Alumínio Perfil','Perfil Pintado PF',
  'Roda Alumínio','Estrutura Alumínio','Pó Alumínio','Radiador de Alumínio',
  'Chaparia PF','Panela Limpa PF','Limalha Alumínio','Limalha Metal',
  'Cobre 1ª','Cobre 2ª','Cobre 4ª','Bronze','Antimônio','Magnésio','Metal',
  'Inox','Latinha','Lata PF','Chumbo','Radiador Metal'
);
