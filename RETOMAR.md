# 🔄 RETOMAR O PROJETO — leia isto primeiro

Ponto de entrada pra continuar este projeto de onde parou — em **conta nova do Claude**,
no **Codex**, ou em outra máquina.

> Num agente novo, diga: **"Leia o RETOMAR.md e continue de onde parei."**

---

## 1. Fatos do projeto
- **O que é:** Sistema VJA Reciclagem — compra de material de catadores (balança),
  conferência no escritório, venda pra empresas, caixa, contas a receber e relatórios.
- **Stack:** Next.js (App Router) + Supabase (Postgres com RLS) + Vercel. Testes em vitest.
- **Produção / URL:** https://vja-sistema.vercel.app
- **GitHub:** https://github.com/jpavila2/vja-sistema-.git (branch `main`)
- **Como rodar:** `npm run dev` · **Deploy:** `vercel --prod --yes` (a Vercel também
  builda no push do `main`)
- **Supabase project ref:** `zwgexgghhbtjmkxiqxis`
  ⚠️ Esse projeto **não** está na conta ligada ao MCP do Supabase (que só enxerga o
  Blanc House). Migration nova = colar o SQL no SQL Editor do Supabase na mão.

## 2. Onde está cada coisa
- Migrations: `supabase/migrations/NNNN_nome.sql` (vão até `0028`) — numeradas em
  sequência; cada uma é aplicada manualmente no SQL Editor.
- Specs: `docs/superpowers/specs/AAAA-MM-DD-*-design.md`
- Papéis e acesso por rota: `src/lib/auth.ts` (o middleware compara só o **primeiro
  segmento** da rota — rota nova numa base nova precisa entrar no `ACESSO`).
- Regras de negócio testáveis: `src/lib/*.ts` com `*.test.ts` ao lado.

## 3. Estado atual (ATUALIZAR ao concluir cada etapa)
- ✅ Balança, conferência (com pagamento misto dinheiro+PIX), vendas, caixa,
  contas a receber, relatório anual.
- ✅ **26/08/2026** — materiais visíveis nas listagens de venda/compra (dia e mês),
  destaque para material "a classificar", exportação CSV item a item por dia
  (vendas/conferência) e por mês (histórico) em `/api/exportar`, e botão de
  excluir venda de vez (migration `0028_excluir_venda.sql`, espelha o `0020` das compras).
- ✅ **29/10/2026** — filtro Todos/Dinheiro/PIX na Conferência (com total de cada) e
  exportação só PIX (`/api/exportar?...&pagamento=pix`, botões na Conferência e no
  Histórico); CSV de compras ganhou colunas "Pago em PIX"/"Pago em dinheiro". Misto
  entra nos dois filtros. Sem migration — usa `forma_pagamento` + `valor_pix`.
- 🔜 **EM ANDAMENTO: fluxo do material "A classificar".** A ideia acordada:
  botão dedicado na tela de venda que já seleciona o material, pede só o peso
  (preço 0 — o form e o banco já aceitam) e liga "a prazo"; depois, quando a
  empresa devolver a classificação, um botão "Classificar" abre o `editar_venda`
  já existente e troca pelos materiais reais, na data original da venda.
  **Bloqueado numa decisão do João:** o que fazer com o estoque no intervalo —
  hoje a venda debitaria o material "A classificar" (indo a negativo, já que ele
  nunca teve entrada) enquanto PET/PEAD reais seguem parados no estoque. Isso se
  acerta sozinho na hora de classificar, mas fica torto até lá.

## 4. Regras de ouro
- Audite antes de alterar dados; nada de DELETE/UPDATE em massa sem mostrar os números.
- Idempotência: seed/backfill tem que rodar 2x sem duplicar.
- Ao terminar uma etapa: marque `[x]` no plano e atualize a seção "Estado atual" aqui.

## 5. Como retomar (cole num agente novo)
```
Estou continuando este projeto. Leia RETOMAR.md na raiz, depois o spec e o plano
da feature em andamento (seção "Estado atual"). Continue do primeiro passo não marcado.
Não faça escrita em massa sem me mostrar os números antes.
```
