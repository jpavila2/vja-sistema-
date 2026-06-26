# Teste de impressão da notinha (Elgin i9) — Design

**Data:** 2026-06-26
**Status:** aprovado para planejamento

## Objetivo

Validar, num PC Windows com a impressora térmica **Elgin i9** (80mm, ESC/POS)
plugada no USB, se dá para imprimir uma **notinha de compra** direto do
navegador via `window.print()` — com layout legível em 80mm e corte automático
do papel. É um **teste descartável**: serve para decidir se vale virar feature
de verdade. **Não toca em nada do fluxo atual da balança (tablet).**

## Por que assim

A balança roda hoje em tablet e continua assim. Migrar para PC é outra adaptação
que só faz sentido se a impressão funcionar bem. Então o teste é isolado: uma
página própria que qualquer um abre no PC, sem mexer no resto do sistema.

A impressão é via `window.print()` (a i9 instalada como impressora normal do
Windows, driver Elgin). Sem servidor, sem agente local, sem dependência nova —
vai junto no deploy da Vercel que já existe.

## Escopo

- Página isolada **`/teste-nota`** (dentro do app, atrás do login como o resto).
- Renderiza uma notinha de **80mm** com **dados de exemplo** embutidos.
- Botão **"Imprimir"** que chama `window.print()`.
- CSS de impressão que isola só a notinha (esconde nav/resto) e fixa a largura
  do papel.
- Permitir alternar rapidamente alguns parâmetros de layout para calibrar no
  teste (ver "Calibração").

### Fora de escopo (YAGNI)

- Imprimir a partir de compras reais do banco / integração com a conferência.
- Botão de imprimir dentro do fluxo da balança ou da conferência.
- Impressão automática / modo kiosk do Chrome.
- ESC/POS cru / agente local (QZ Tray). Só `window.print()` por enquanto.
- Logo em imagem (usa texto; logo fica para depois se virar feature).

## Conteúdo da notinha

Recibo simples de compra de recicláveis (não é documento fiscal):

```
        V.J.A. RECICLAGEM
     Recibo de compra (não fiscal)
--------------------------------
Data: 26/06/2026 14:32
Vendedor: João da Silva
--------------------------------
Material        Peso   R$/un   Subtotal
Alumínio      3,50kg   6,00     21,00
Cobre         1,20kg  28,00     33,60
Papelão      10,00kg   0,40      4,00
--------------------------------
TOTAL                          R$ 58,60
Pagamento: Misto
  PIX:      R$ 30,00
  Dinheiro: R$ 28,60
--------------------------------
     Obrigado! Volte sempre.
```

Observações:
- Cabeçalho (nome do negócio) e rodapé são **texto editável no código** — no
  teste a gente ajusta na hora.
- Mostra a forma de pagamento reaproveitando o conceito já existente
  (`dinheiro` / `pix` / `misto`), incluindo a quebra do misto.
- Linhas divisórias com hífens (estilo cupom).

## Layout / CSS de impressão

- Fonte **monoespaçada** (ex.: a Geist Mono que o projeto já tem, ou
  `monospace`) para alinhar colunas como cupom.
- Container de largura fixa do papel: **~72mm** de área imprimível dentro dos
  80mm.
- `@media print`:
  - `@page { size: 80mm auto; margin: 0; }`
  - Esconde tudo que não for a notinha (`nav`, botões, etc.).
  - Sem cores de fundo (papel térmico é P&B); texto preto.
- Fora da impressão (tela), mostra a notinha num "preview" centralizado + o
  botão Imprimir, pra dar pra ver antes de mandar.

> **Corte automático do papel:** é configuração do **driver da i9** no Windows
> ("cortar após imprimir"), não do HTML. Faz parte do teste: instalar o driver,
> ligar o corte e conferir.

## Calibração (controles só pra teste)

Botões/sliders simples na própria página para achar o ajuste certo da i9 sem
recompilar:
- Tamanho da fonte (ex.: 11px / 12px / 13px).
- Largura do papel (ex.: 72mm / 76mm / 80mm).
- Mostrar/ocultar o rodapé.

São controles de tela (não saem na impressão). Quando achar o ajuste bom,
fixamos no código.

## Como testar (passo a passo no PC)

1. Instalar o driver da Elgin i9 no Windows; imprimir página de teste do
   Windows para garantir que a impressora responde.
2. Ligar a opção de corte automático no driver.
3. Abrir o sistema no Chrome do PC, logar, ir em `/teste-nota`.
4. Clicar **Imprimir**, escolher a i9, conferir margens no preview do Chrome
   (margens "Nenhuma", escala 100%).
5. Avaliar: largura ok? texto legível? colunas alinhadas? cortou sozinho?
6. Ajustar pelos controles de calibração e repetir até ficar bom.

## Critério de sucesso

A notinha sai da i9 legível, na largura certa, com as colunas alinhadas e o
papel cortado automaticamente — com no máximo 1 clique (o "Imprimir" do Chrome).
A partir daí decidimos se vira feature (botão na conferência/balança) e se vale
migrar a operação para PC.

## Testes (código)

- A página renderiza sem erro e o botão chama `window.print()` (smoke test de
  componente). O resto da validação é **física**, no papel — não dá para cobrir
  com teste automatizado.
