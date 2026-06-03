# Design — Preço editável na balança + ajuste de materiais e compradores

Data: 2026-06-03
Status: aprovado (brainstorming)

## Contexto

VJA Reciclagem. Na balança (compra de catadores) o preço pago por kg é fixo
(`material.preco_compra`). O João às vezes faz **preço especial** na compra e
precisa editar o preço na hora de adicionar o item ao carrinho, pra o cálculo
já sair certo. A tela de **Vendas já tem** esse campo de preço editável — o
mesmo padrão será espelhado na balança. O backend já aceita preço livre.

Também há ajustes de cadastro: renomear materiais, adicionar materiais novos e
cadastrar novos locais de venda (compradores).

## Decisões tomadas (brainstorming)

- **Enfardamento (latinha/papelão/PET):** modelo **simples** — um material só,
  com preço de compra (solto) e preço de venda (fardo). A margem é o "agregar
  valor". Sem fluxo de conversão de estoque.
- **Latinha:** renomear o material existente `Lata Enfardada` → `Latinha`.
  `Alumínio` permanece (alumínio duro/perfil).
- **Preços de venda:** virão de uma planilha de vendas de maio (preço de venda
  atual = valor da última venda do mês). Materiais que existirem na planilha e
  ainda não estiverem cadastrados serão adicionados. **Preço de compra** é
  definido pelo João depois (muda com facilidade).

## Escopo

### 1. Preço editável na balança (frontend)
Arquivo: `src/app/(app)/balanca/TelaBalanca.tsx` (somente frontend; o RPC
`registrar_compra` e o schema em `actions.ts` já aceitam `preco_unitario` livre).

- Novo estado `precoStr`, inicializado em `abrir(m)` com `m.preco_compra`.
- Campo de texto "Preço (R$/un)" no modal do teclado, editável (inputMode
  decimal), espelhando o padrão de `TelaVendas.tsx`.
- `valorAtual` e `adicionar()` passam a usar o preço editado em vez de
  `sel.preco_compra`. Impureza (%) continua aplicada sobre o peso, independente
  do preço.
- O item na cesta já exibe `× R$ x,xx`; passará a refletir o preço editado.

### 2. Materiais (migração `supabase/migrations/0008_*.sql`)
Parte feita agora (independe da planilha):
- Renomear `Ferro` → `Sucata Pesada` (mantém preço atual).
- Renomear `Lata Enfardada` → `Latinha`.

Parte que aguarda a planilha:
- Adicionar materiais que aparecerem na planilha e não existirem (ex.: Caixaria,
  Garrafinha Colorida PEAD, Garrafinha Preta), com `preco_venda` = última venda
  de maio e `preco_compra` = 0 (João ajusta depois).

### 3. Compradores / locais de venda (mesma migração)
Cadastrar como `cliente`, com a especialidade em `observacoes`:
- CIRTEL — sucata pesada e mista
- Metal Pronto — sucata pesada e mista
- CPR — plásticos
- CRR — papelão, PET e outros *(já existe — só atualizar observação)*

Obs.: o sistema não filtra material por comprador; a observação é só nota.

## Fora de escopo
- Conversão de estoque solto → fardo.
- Filtro de materiais por comprador.

## Testes
- `calcSubtotal` já coberto. Verificar build/lint. A mudança da balança é de UI;
  validar manualmente que o preço editado chega no payload de `registrarCompra`.
