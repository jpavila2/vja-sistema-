# Balança: pesagens simultâneas (comandas) + offline com fila de envio

**Data:** 2026-06-17
**Status:** Aprovado para planejamento

## Problema

Hoje a balança (`src/app/(app)/balanca/`) tem duas limitações que atrapalham o dia a dia do ferro-velho:

1. **Uma pesagem por vez.** Para abrir a pesagem de um cliente é preciso finalizar a do anterior. Quando um cliente grande (vários materiais, bruto → descarrega → tara) demora, os clientes rápidos ficam esperando. O contorno manual hoje é anotar no papel e relançar — retrabalho e risco de erro.
2. **Depende de internet para tudo.** Se a internet/energia cair no meio de uma pesagem, o que estava em andamento pode se perder. Como muitas vezes pesa-se e já joga o material na balança seguinte, perder o peso é crítico.

## Decisão de escopo

- **Pesagens simultâneas são locais ao aparelho.** Uma pesagem aberta fica salva no próprio tablet/PC e é finalizada nele. Não há sincronização de pesagens *em andamento* entre aparelhos. Após FINALIZAR, a compra vira registro no sistema e aparece para todos (como já é hoje).
- **Offline = "Nível 1".** Protege contra queda de internet/energia **com a página já aberta**. Não cobre abrir o app do zero sem internet (isso seria um PWA / "Nível 2", fora deste escopo).

## Estado atual relevante

- `TelaBalanca.tsx` mantém **uma** `cesta` persistida em `localStorage` via `usePersistedState` (chave `vja:balanca:cesta:v1`). O catador selecionado e a pesagem em andamento (peso, bags, impureza) ficam em `useState` **não persistido**.
- Finalizar chama a server action `registrarCompra` → RPC `registrar_compra`. Já existe `client_request_id` (UUID) para idempotência — retentar o mesmo envio não duplica a compra.
- `criarCatador` (cadastro rápido que grava na hora) exige rede. O modo "cadastro rápido" via `novoNome`/`novoTel` é enviado junto da compra e criado no servidor no momento do registro (não exige rede antecipada).

## Solução

### 1. Comandas (pesagens simultâneas)

Substituir a única `cesta` por uma lista de **comandas**, cada uma com seu próprio estado completo de pesagem.

**Modelo de uma comanda (persistido no aparelho):**
- `id`: UUID local da comanda.
- `client_request_id`: UUID de idempotência (hoje é `reqId`); passa a viver na comanda.
- `criadaEm`: timestamp.
- Estado do catador: `modo` (`conhecido` | `novo` | `avulso`), `catadorSel`, `busca`, `novoNome`, `novoTel`.
- `cesta`: `ItemCesta[]` (itens já adicionados).
- `salvarPrecos`: boolean.

**Estado de UI persistido:**
- `comandas`: lista de comandas abertas.
- `comandaAtivaId`: qual comanda está em foco.

**Fluxo:**
- Barra de comandas no topo da balança: um "chip" por comanda aberta (`nome do catador (nº itens)`), com a ativa destacada, mais um botão **➕ Nova**.
- Tocar num chip torna aquela comanda a ativa; a tela inteira (catador + itens + total) reflete a comanda ativa.
- **➕ Nova** cria uma comanda vazia e a torna ativa, sem mexer nas outras.
- A pesagem em andamento (modal de teclado: `pesoStr`, `bags`, `kgBag`, `pct`, `precoStr`, material `sel`) pertence à comanda ativa e também é salva, para sobreviver a recarga no meio da digitação.
- **FINALIZAR** age sobre a comanda ativa: ao concluir (online ou via fila), remove a comanda da lista e ativa a próxima (ou estado vazio se não houver outra).
- Sem limite prático de comandas.

**Migração do rascunho existente:** se houver uma `cesta` salva na chave antiga (`vja:balanca:cesta:v1`), convertê-la em uma primeira comanda ao carregar, para não perder rascunho de quem já está usando.

### 2. Offline: rascunho completo + fila de envio

**(a) Rascunho completo.** Todo o estado das comandas (incluindo catador e pesagem em andamento) é persistido continuamente no aparelho. Queda de internet/energia → ao reabrir, tudo volta.

**(b) Fila de envio (outbox).** Ao FINALIZAR:
- Tenta registrar normalmente (`registrarCompra`).
- **Sem rede / falha de envio:** o payload da compra (com seu `client_request_id`) entra numa **fila** persistida no aparelho (`localStorage`, chave dedicada). A comanda é encerrada (sai da lista de abertas) e a compra fica "pendente de envio". O operador continua trabalhando.
- **Sucesso imediato:** comportamento atual (compra no sistema na hora).

**Sincronização automática:**
- Um "remetente" tenta enviar os itens da fila quando: (i) o navegador dispara o evento `online`, (ii) periodicamente (intervalo curto, ex. cada 20–30s) enquanto houver itens na fila, e (iii) ao carregar a tela.
- Cada envio reusa `registrarCompra` com o `client_request_id` original → idempotente, sem risco de duplicar.
- Item enviado com sucesso sai da fila. Falha → permanece e tenta de novo.

**Feedback visual:**
- Indicador de status: `📤 N compra(s) aguardando internet (sobe sozinho)` quando a fila tem itens; some quando a fila esvazia.
- Mensagem ao finalizar offline: deixa claro que a compra foi **registrada no aparelho** e subirá sozinha — não foi perdida.

**Catador no modo offline:** o "cadastro rápido" deve ir embutido no payload da compra (`catador_nome`/`catador_telefone`), que o servidor resolve no momento do registro. A action `criarCatador` (grava antes de finalizar) continua exigindo rede; offline, orientar o uso do cadastro rápido embutido.

## Arquitetura / organização

Para manter `TelaBalanca.tsx` sustentável (já é grande), extrair responsabilidades em unidades focadas:

- **`useComandas` (hook):** dono da lista de comandas, comanda ativa, criar/trocar/encerrar comanda, persistência. Inclui migração da chave antiga.
- **`useFilaEnvio` (hook):** dono da fila de envio (outbox) — enfileirar, listar pendentes, remeter, escutar `online` + intervalo. Expõe `pendentes` (contagem) e `enfileirar(payload)`.
- **`BarraComandas` (componente):** os chips + botão Nova.
- **`IndicadorFila` (componente):** o aviso de pendências de envio.
- `TelaBalanca.tsx` passa a orquestrar esses pedaços, lendo/escrevendo da comanda ativa.

Server actions e RPCs **não mudam** (`registrarCompra`/`registrar_compra` já são idempotentes). Nenhuma alteração de banco é necessária.

## Casos de borda

- **Duplo-clique / retry:** coberto por `client_request_id` por comanda.
- **Fila + sucesso tardio:** se um envio aparenta falhar mas chegou ao servidor, o `client_request_id` evita duplicar no retry.
- **Recarga no meio da pesagem (modal aberto):** estado da pesagem em andamento persiste; modal pode ser reaberto no mesmo ponto (ou, no mínimo, o material/valores ficam preservados na comanda).
- **localStorage cheio/indisponível:** degrada como hoje (segue sem rascunho), sem quebrar.
- **Mesma compra em dois aparelhos:** não se aplica — comandas são locais; cada compra tem `client_request_id` único.

## Fora de escopo (explícito)

- PWA / abrir o app sem internet (Nível 2).
- Sincronizar pesagens *em andamento* entre aparelhos.
- Teclado na tela no PC vs tablet (demanda #2, fica na fila).

## Critérios de sucesso

1. É possível ter 2+ pesagens abertas ao mesmo tempo e alternar entre elas sem perder nada.
2. Finalizar uma comanda não afeta as outras.
3. Recarregar/fechar a aba e reabrir: comandas e pesagem em andamento voltam.
4. Finalizar sem internet não perde a compra; ela aparece como pendente e sobe sozinha quando a conexão volta, sem duplicar.
5. Comportamento online atual permanece idêntico para o caso simples (uma compra, com internet).
