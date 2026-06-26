# Pagamento misto (dinheiro + PIX) na conferência — Design

**Data:** 2026-06-26
**Status:** aprovado para planejamento

## Problema

Algumas compras são pagas **parte em dinheiro e parte em PIX**. Hoje a compra
tem um único campo `forma_pagamento` ("dinheiro" ou "pix"), escolhido na
conferência (no botão **Conferir** e no modo **Editar**). Não dá para registrar
um pagamento dividido. O escritório quer ajustar isso **na hora da conferência**.

## Escopo

- Permitir registrar pagamento **misto** numa compra, na tela de conferência.
- Entrada: o operador digita **quanto foi no PIX**; o dinheiro é **o resto**
  (`dinheiro = total − pix`), calculado e exibido ao vivo.
- Vale tanto no botão **Conferir** (compra pendente) quanto no modo **Editar**.
- Mostrar a divisão no card da compra (modo visualização).

### Fora de escopo (YAGNI)

- Quebrar pix vs dinheiro em relatório/caixa. Hoje esses relatórios **não**
  usam `forma_pagamento`; a feature não muda isso. O dado fica registrado e
  disponível se um dia quisermos esse relatório.
- Outras formas de pagamento além de dinheiro/PIX.
- Impressão de notinha (é um entregável separado, ver nota no fim).

## Modelo de dados

Tabela `purchases`:

- `forma_pagamento` passa a aceitar um terceiro valor: **`"misto"`**
  (além de `"dinheiro"` e `"pix"`).
- **Nova coluna** `valor_pix numeric not null default 0` — quanto da compra foi
  pago em PIX.

Regra de preenchimento (o dinheiro é sempre derivado, nunca armazenado):

| forma_pagamento | valor_pix      | dinheiro (derivado) |
|-----------------|----------------|---------------------|
| `dinheiro`      | `0`            | `total`             |
| `pix`           | `total`        | `0`                 |
| `misto`         | valor digitado | `total − valor_pix` |

Invariante validada no servidor: `0 ≤ valor_pix ≤ total`.

> Guardar só `valor_pix` (e derivar o dinheiro) evita inconsistência: se os
> itens da compra forem editados e o total mudar, o dinheiro se recalcula
> sozinho. Para `misto`, se o novo total ficar **menor** que o `valor_pix`
> salvo, o servidor faz clamp de `valor_pix` para o novo `total`.

## Fluxo / UI

### 1. Botão "Conferir" (compra pendente)

O `<form action={conferirCompra}>` atual usa um `<select>` simples e não tem
interatividade. Vira um pequeno **client component** (`FormConferir`) para
suportar o campo condicional e o cálculo ao vivo:

- Seletor de pagamento: **Dinheiro · PIX · Misto**.
- Ao escolher **Misto**, aparece um campo "PIX R$ ___" e um texto
  "Dinheiro: R$ X" calculado como `total − pix`.
- Envia `forma_pagamento` e (quando misto) `valor_pix` para a server action.

### 2. Modo "Editar" (`CardCompra`)

Já existe o `<select>` de Pagamento e o `totalEdit` recalculado ao vivo. Acrescenta:

- Opção **Misto** no select.
- Quando misto: campo "PIX R$ ___" + linha "Dinheiro: R$ (totalEdit − pix)".
- Validação no submit: `0 ≤ pix ≤ totalEdit`.

### 3. Modo visualização (`CardCompra`)

O badge que hoje mostra `PIX` / `Dinheiro` passa a mostrar, quando misto:
**`Misto · R$X pix / R$Y din`**.

## Camada servidor (`conferencia/actions.ts`)

- **`conferirCompra`**: ler `forma_pagamento` e `valor_pix` do `FormData`.
  Normalizar forma para `dinheiro|pix|misto`. Calcular `valor_pix` conforme a
  tabela acima, fazendo clamp em `[0, total]` (lendo o `total` da compra).
  Atualizar `forma_pagamento` e `valor_pix`.
- **`editarCompra`**: hoje chama a RPC `editar_compra`, que **recalcula o total**
  a partir dos itens. Preferência: **estender a RPC** para aceitar
  `p_valor_pix` e gravar/clampar dentro da transação (mantém total e valor_pix
  consistentes atomicamente). Alternativa, se mexer na RPC for inviável: após a
  RPC, ler o novo `total` e fazer um `update({ valor_pix: clamp })` separado.

## Testes

- Unit (regra de cálculo, em `src/lib/`): dada `forma` + `valor_pix` + `total`,
  retorna `{ forma_pagamento, valor_pix }` normalizado e com clamp. Casos:
  dinheiro→pix=0; pix→pix=total; misto dentro do range; misto > total (clamp);
  misto negativo (→0); total muda e fica < pix salvo (clamp).
- Componente: ao escolher Misto, o campo PIX aparece e o "Dinheiro: R$" reflete
  `total − pix`.

## Nota — entregável separado (não faz parte deste spec)

**Teste de impressão da notinha (Elgin i9):** página isolada `/teste-nota` que
monta um recibo de 80mm (dados de exemplo ou do `useRecibos`) com botão
Imprimir, para validar a impressora num PC Windows via `window.print()`. Não
toca no fluxo atual do tablet. Será especificado/implementado depois, após o
pagamento misto.
