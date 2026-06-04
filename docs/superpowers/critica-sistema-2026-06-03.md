# Crítica completa — VJA Reciclagem (03/06/2026)

Contexto de avaliação: operadores com **pouca instrução**, precisa ser **fácil e
visual**, mas **completo** para gestão. Avaliado: design, UX, funcionalidade,
ferramentas e lacunas de gestão. Detector automático de "AI slop": **0 achados**.

## Nota de saúde (heurísticas de Nielsen)

| # | Heurística | Nota | Principal problema |
|---|-----------|:----:|--------------------|
| 1 | Visibilidade do status | 3/4 | Balança/Vendas/Login dão feedback; Caixa/Conferência não mostram "salvando" nem sucesso |
| 2 | Linguagem do mundo real | 4/4 | Emojis, "saiu da gaveta", "catador" — excelente |
| 3 | Controle e liberdade | 2/4 | Sem editar itens de uma venda; sem desfazer; navegação de data fraca |
| 4 | Consistência | 2/4 | Entrada de número varia (teclado da balança × teclado do celular × texto no caixa) |
| 5 | Prevenção de erro | 2/4 | Valores em texto livre (R$), erros "jogados" na tela |
| 6 | Reconhecer em vez de lembrar | 3/4 | Grades visuais + busca; mas material só por texto (sem foto) |
| 7 | Flexibilidade/eficiência | 2/4 | Sem filtros de período no histórico; sem atalhos |
| 8 | Estético e minimalista | 3/4 | Limpo e na marca; algumas tabelas densas demais |
| 9 | Recuperação de erro | 2/4 | Ações que dão erro mostram a tela de erro do Next (assusta) |
| 10 | Ajuda e documentação | 1/4 | Nenhuma; sem onboarding nem dicas |
| **Total** | | **24/40** | **MVP sólido, com lacunas reais para o público-alvo** |

## Veredito anti-padrões
- **LLM:** NÃO parece "feito por IA". Tem identidade (teal/dourado/navy, emojis,
  copy em pt-BR coloquial). Bom.
- **Detector determinístico:** 0 achados em `src/app` e `src/components`.

## O que está bom (manter)
1. **Linguagem visual e direta** — emojis nos materiais, "💵 FINALIZAR E PAGAR",
   "entrou/saiu da gaveta". Perfeito para baixa instrução.
2. **Balança** — teclado grande, impureza em 1 toque, preço editável, busca.
   É a melhor tela do sistema.
3. **Integridade** — idempotência (client_request_id), RLS por papel, estorno de
   estoque ao cancelar. Base de dados séria.

## Problemas prioritários (design/UX)

### [P1] Erros "crus" assustam o operador
Ações de formulário (`conferirCompra`, `cancelarCompra`, `cancelarVenda`,
`trocarClienteVenda`, `removerMovimento`, `abrirCaixa`, `lancarMovimento`,
`fecharCaixa`) fazem `throw` quando dá erro → cai na **tela de erro do Next**,
que para a menina é "o sistema quebrou".
**Correção:** um `error.tsx` amigável no grupo `(app)` ("Algo deu errado, toque
para tentar de novo") + idealmente mensagens inline. Quick win de alto impacto.

### [P1] Entrada de dinheiro é frágil e inconsistente
No Caixa (saque/despesa/fechar) e na Venda, o valor é `<input>` de texto. Um
operador pode digitar "1.000,50", "1000,5", "1,000.50". Sem máscara, vira valor
errado no caixa.
**Correção:** componente único de **R$ com máscara** (ou teclado numérico estilo
balança) usado em todo lugar. Padroniza e previne erro de digitação no dinheiro.

### [P2] Métodos de digitar número inconsistentes entre telas
Balança = teclado grande na tela; Vendas = teclado do celular; Caixa = texto.
Para o mesmo perfil de usuário, isso aumenta a carga cognitiva.
**Correção:** adotar o teclado grande da balança (ou a máscara) como padrão de
peso/valor nas três telas.

### [P2] Navegação de data difícil no Caixa/Conferência
Caixa usa `<input type="date">` puro; Conferência é fixa em "hoje". Para baixa
instrução, escolher data num date-picker é barreira.
**Correção:** setas **◀ ontem / hoje / amanhã ▶** + a data por extenso. Mesmo
padrão no Relatório (já tem nos anos).

### [P3] Tabelas densas (estoque, sessões de caixa)
Tabelas de texto puro são difíceis para baixa instrução.
**Correção:** no painel, estoque como "cards" com cor (verde/amarelo/vermelho) e
ícone; deixar a tabela como visão "detalhe".

## Lacunas de funcionalidade / gestão (o que falta para gerir bem)

1. **[P1] Margem por material** — o sistema tem preço de compra E venda, mas
   nenhum lugar mostra **quanto se ganha por material** (venda − compra). É o
   número de ouro para decidir o que comprar/priorizar.
2. **[P1] Contas a receber** — vendas grandes (CRR, NOVO RIO, Cobremax) são em
   boleto/transferência e pagas depois. Hoje a `forma_pagamento` é registrada,
   mas não há **"pago × a receber"**. Para gestão de caixa real, isso é crítico.
3. **[P2] Histórico por período** — Vendas mostra só "hoje"; Compras não têm
   lista nenhuma fora da conferência do dia. Falta **ver vendas/compras de um mês**
   com total, filtro por cliente/material.
4. **[P2] Ranking de catadores (fornecedores)** — quanto cada catador trouxe no
   mês. Útil para relacionamento e negociação.
5. **[P2] Ajuste/inventário de estoque** — existe o tipo `ajuste` no banco, mas
   sem tela. Sem contagem física, o estoque diverge com o tempo.
6. **[P3] Exportar para o contador** — CSV/Excel de vendas, compras e despesas
   do mês.
7. **[P3] Resultado real com despesas no período** — o painel já desconta
   despesas no mês; faltam **despesas no Relatório do ano** e o **lucro líquido
   anual** (hoje o anual mostra só receita).

## Lente "baixa instrução" (oportunidades visuais)

1. **[P1] Foto dos materiais** — para quem lê pouco, **foto** bate texto. Um
   campo de imagem no material e fotos na grade da balança/venda seria o maior
   salto de usabilidade.
2. **[P2] Cores por categoria** — Material Fino, Pesado, Plástico, Papel,
   Eletrônico com cor fixa nos botões; o olho acha mais rápido que lendo.
3. **[P2] Confirmação visual de sucesso** em todas as ações (um "✅ Salvo"
   grande e verde), não só na balança.
4. **[P3] Voz** — você já tem a skill Alexa "Maestro"; dá para "Alexa, quanto
   vendi hoje?" consultar o sistema. Futuro.

## Bandeiras por persona

- **Menina do escritório (pouca tech):** erro cru = pânico (P1); date-picker e
  valor em texto = erro de dinheiro (P1); sem "✅ salvo" no caixa = insegurança.
- **Operador da balança (mãos sujas, rápido):** já bem servido (teclado, busca).
  Faltaria foto do material e talvez confirmar peso em voz alta.
- **João (gestão):** falta margem por material, a receber, histórico mensal e
  ranking de catador. O sistema registra bem, mas **informa pouco para decidir**.

## Roadmap sugerido (ordem de impacto × esforço)

**Quick wins (baixo esforço, alto impacto)**
- A1. `error.tsx` amigável no grupo `(app)`.
- A2. Setas de data (ontem/hoje/amanhã) no Caixa + Conferência por data.
- A3. "✅ Salvo" visual nos forms do Caixa.
- A4. Despesas + lucro líquido no Relatório do ano.

**Médio (1 feature cada)**
- B1. Componente único de R$ com máscara/teclado, usado em tudo.
- B2. Tela "Margem por material" (compra × venda × estoque × lucro potencial).
- B3. Histórico de Vendas/Compras por mês com filtro.
- B4. Ranking de catadores no mês.

**Maior (estrutural)**
- C1. Fotos de materiais (upload + storage + exibição).
- C2. Contas a receber (status pago/pendente + tela de cobranças).
- C3. Ajuste/inventário de estoque.

## Perguntas que destravam
- O estoque atual é confiável hoje, ou precisamos de uma contagem inicial?
- As vendas a prazo (boleto/transf.) precisam de controle de "a receber" já?
- Vale investir em foto de material agora (maior ganho visual) ou primeiro
  blindar erros e dinheiro (mais seguro)?
