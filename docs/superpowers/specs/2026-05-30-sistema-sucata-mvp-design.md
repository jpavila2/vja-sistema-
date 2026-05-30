# Sistema de Gestão de Sucata/Reciclagem — Spec do MVP (Fase 1)

**Data:** 2026-05-30
**Autor:** João Pedro + Claude
**Status:** Em revisão

---

## Contexto

João opera um comércio de reciclagem/sucata em Itaguaí/RJ. Catadores chegam à balança e
vendem materiais (papelão, alumínio, ferro, cobre, etc.). Hoje:

- A atendente da balança anota **em papel** material, peso e valor.
- Uma segunda atendente, no escritório, pega o papel e digita compra a compra num
  programa pago chamado **"Custom System"**.
- Não existe controle de vendas, despesas, estoque ou financeiro — apenas o registro de compras.

**Objetivo:** substituir o Custom System por um sistema próprio, começando por um MVP que
**acaba com a digitação lenta** e organiza as compras, e que depois cresce para vendas,
estoque, financeiro, frota e relatórios.

**Decisão de escopo:** o projeto inteiro (~11 módulos) foi dividido em 3 fases. Esta spec
cobre **apenas a Fase 1 (MVP)**. Fases 2 e 3 estão listadas como roadmap, sem detalhamento.

### Decisões do usuário (brainstorming)
- Catador traz **vários materiais** por vez; pagamento **sempre em dinheiro, na hora**.
- Tela de lançamento **clicável/touch** aprovada (mockup em `mockups/balanca.html`).
- Começar do **zero** (sem migrar dados do Custom System).
- **Desconto de impureza:** manual (ajuste do peso líquido na mão, sem regra fixa).
- **Internet:** boa; a balança **não fica conectada no MVP** — quem digita é o escritório,
  a partir do papel. Logo: **MVP é só-online, sem modo offline.** Tablet no pátio = upgrade futuro.
- **Catador:** **sempre pedir o nome** (cadastro rápido) antes de finalizar a compra.

---

## Escopo — Fases

### FASE 1 — MVP (esta spec)
1. Login com 3 perfis (admin, escritório, balança)
2. Catálogo de materiais
3. Cadastro de pessoas (clientes + fornecedores/catadores)
4. Tela de lançamento rápido de compras (a clicável)
5. Conferência das compras
6. Caixa do dia (resumo automático)

### FASE 2 — (roadmap, não detalhado aqui)
Vendas + baixa de estoque · controle de estoque · contas a pagar/receber · despesas · dashboard.

### FASE 3 — (roadmap)
Frota/veículos · relatórios (lucratividade, DRE, rankings) · PWA · dark mode · integração da balança digital.

---

## Arquitetura

- **Frontend/Backend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS, um único projeto.
- **Banco/Auth/Storage:** Supabase (PostgreSQL + Auth + Storage).
- **Deploy:** Vercel (app) + Supabase (banco).
- **Validação:** Zod + react-hook-form.
- **Idioma:** tudo em português (pt-BR). Responsivo (funciona no celular/tablet).

### Três superfícies (telas-mãe)
| Rota | Uso | Perfil |
|------|-----|--------|
| `/balanca` | Lançamento rápido touch (escritório agora; tablet do pátio depois) | balança, escritório, admin |
| `/escritorio` | Conferência, cadastros (materiais e pessoas) | escritório, admin |
| `/` (painel) | Resumo do dia | admin |

---

## Modelo de dados (Fase 1)

Convenções (Postgres best practices): identificadores `snake_case`; IDs `bigint generated always as identity`
(ou `uuid` em `profiles`, ligado ao Auth); dinheiro `numeric(12,2)` (nunca float); peso `numeric(10,3)`;
datas `timestamptz`; enums como `text` + `check`; índice em toda FK.

### `profiles`
Ligada ao usuário do Supabase Auth.
- `id uuid` (= `auth.users.id`), `nome text`, `papel text check in ('admin','escritorio','balanca')`,
  `ativo boolean default true`, `created_at timestamptz`.

### `people` (clientes e fornecedores unificados)
- `id`, `nome text not null`, `tipo text check in ('cliente','fornecedor','ambos')`,
  `documento text` (CPF/CNPJ, opcional), `telefone text`, `whatsapp text`,
  `endereco text`, `observacoes text`, `status text check in ('ativo','inativo') default 'ativo'`,
  `created_at`, `updated_at`.
- Índice: `nome` (busca), `documento`.

### `materials`
- `id`, `nome text not null`, `categoria text check in ('metal','plastico','papel','eletronico','outros')`,
  `unidade text check in ('kg','ton','un') default 'kg'`, `preco_compra numeric(12,2) not null default 0`,
  `estoque_atual numeric(12,3) not null default 0`, `estoque_minimo numeric(12,3) default 0`,
  `emoji text`, `cor text`, `ativo boolean default true`, `created_at`, `updated_at`.
- `estoque_atual` é **mantido por trigger/transação a partir de `stock_movements`** (ver regra de estoque).

### `purchases` (cabeçalho da compra)
- `id`, `pessoa_id bigint references people` (obrigatório — sempre pede nome),
  `operador_id uuid references profiles` (quem lançou),
  `data_hora timestamptz not null default now()`,
  `total numeric(12,2) not null`,
  `forma_pagamento text check in ('dinheiro','pix','transferencia','prazo') default 'dinheiro'`,
  `status text check in ('pendente','conferida','cancelada') default 'pendente'`,
  `conferida_por uuid references profiles`, `conferida_em timestamptz`,
  `motivo_cancelamento text`, `observacoes text`, `created_at`, `updated_at`.
- Índices: `pessoa_id`, `data_hora`, `status`.

### `purchase_items`
- `id`, `purchase_id bigint references purchases on delete cascade`,
  `material_id bigint references materials`,
  `peso_bruto numeric(10,3) not null`,
  `peso_liquido numeric(10,3) not null` (= bruto, salvo ajuste manual de impureza),
  `preco_unitario numeric(12,2) not null` (**congelado** no momento da compra),
  `subtotal numeric(12,2) not null` (= peso_liquido × preco_unitario, arredondado 2 casas).
- Índices: `purchase_id`, `material_id`.

### `stock_movements` (log de estoque — incluído já no MVP)
Necessário para manter o estoque consistente quando a conferência edita/cancela.
- `id`, `material_id bigint references materials`,
  `tipo text check in ('entrada_compra','ajuste','estorno')`,
  `quantidade numeric(12,3) not null` (positiva entra, negativa sai),
  `purchase_item_id bigint references purchase_items` (origem, opcional),
  `motivo text`, `created_by uuid references profiles`, `created_at timestamptz default now()`.
- Índices: `material_id`, `purchase_item_id`.

---

## Regras de negócio críticas

1. **Estoque consistente (transacional).** Toda compra que altera estoque grava em
   `stock_movements` dentro da **mesma transação** do `purchase_item`. `materials.estoque_atual`
   é atualizado a partir desses movimentos.
   - Editar um item → cria movimento de **estorno** do antigo + nova entrada.
   - Cancelar compra → gera estorno de todos os itens (estoque volta ao que era).

2. **Nunca apagar compra.** "Excluir" = `status = 'cancelada'` + `motivo_cancelamento` (soft delete).
   O caixa e relatórios **ignoram** compras canceladas. Nada some do histórico.

3. **Preço congelado.** `purchase_items.preco_unitario` guarda o preço do momento. Alterar o
   preço de um material **não** altera compras passadas.

4. **Fuso horário.** Tudo `timestamptz`; o "caixa do dia" calcula o dia em **America/Sao_Paulo**
   (evita compra da virada de meia-noite cair no dia errado).

5. **Arredondamento.** `subtotal = round(peso_liquido × preco_unitario, 2)` (2 casas, meio pra cima).

6. **Catador obrigatório.** Toda compra exige `pessoa_id`. Na tela, cadastro rápido por nome
   (telefone/documento opcionais; escritório completa depois).

---

## Segurança (RLS — desde o início)

RLS ligado em todas as tabelas. Políticas por papel (lido de `profiles`):

- **balança:** pode **inserir** compras e itens; **lê** materiais e pessoas; **não** acessa
  caixa/financeiro nem edita cadastros.
- **escritório:** lê/edita compras (conferência, cancelamento), pessoas e materiais; vê o caixa.
- **admin:** acesso total.

Boas práticas aplicadas (skill Supabase):
- Funções de auth envolvidas em subquery: `(select auth.uid())` — evita chamada por linha.
- Checagem de papel via função `security definer` em schema privado (ex: `private.papel_do_usuario()`),
  com `revoke execute` de `anon`/`authenticated` indevidos.
- Índices nas colunas usadas nas políticas.

---

## Fluxo do dia (MVP)

1. **Lançamento** (escritório a partir do papel; ou balança no tablet, futuro): seleciona material →
   peso (ajuste manual de impureza se precisar) → valor calculado → vários itens → informa o catador
   (nome) → finaliza em dinheiro. Compra entra como **pendente** e gera entradas de estoque.
2. **Conferência:** lista de pendentes do dia; revisar/corrigir/cancelar; vincular ao catador certo;
   marcar **conferida** (`conferida_por` / `conferida_em`). Se a mesma pessoa lançou e conferiu,
   pode marcar conferida na hora.
3. **Caixa do dia:** total comprado, total pago em dinheiro, nº de compras, ticket médio —
   automático, substituindo o Excel/Custom System manual.
4. **Painel (admin):** resumo do dia.

---

## Componentes reutilizáveis (base para Fases 2/3)

- Tabela com busca + filtro + paginação.
- Formulário com validação (Zod + react-hook-form) + modal de confirmação de exclusão/cancelamento.
- Cards de resumo (KPIs).
- Tela touch de lançamento (grade de materiais + teclado numérico + cesta + finalizar).
- Cadastro rápido de pessoa (inline, só nome obrigatório).

---

## Seeds (dados de exemplo)

- Materiais iniciais com preço: Papelão, PET, Plástico, Alumínio, Ferro, Cobre, Inox, Bateria.
- 1 usuário de cada papel (admin/escritório/balança) para teste.
- Alguns catadores recorrentes (ex: "Seu Zé", "Marcão") + clientes/indústrias de exemplo.

---

## Verificação (como testar de ponta a ponta)

1. Subir Supabase (migrations + seeds) e rodar `next dev`.
2. **Login** com cada perfil; confirmar que balança **não** vê o caixa (RLS).
3. **Lançar compra** com 2+ itens, um com ajuste manual de impureza; conferir cálculo do total.
4. Confirmar que o **estoque** dos materiais subiu na medida certa (via `stock_movements`).
5. Na **conferência**, editar um item → estoque corrige; cancelar uma compra → estoque estorna e
   o caixa do dia desconta.
6. **Caixa do dia:** total bate com a soma das compras conferidas (não canceladas), no fuso BR.
7. Testar a tela touch no **celular/tablet** (responsivo, alvos grandes).

---

## Fora de escopo no MVP (confirmado)

Vendas, despesas, contas a pagar/receber, frota, relatórios, exportação PDF/Excel, PWA,
dark mode, integração serial da balança, modo offline. Tudo isso é Fase 2/3.
