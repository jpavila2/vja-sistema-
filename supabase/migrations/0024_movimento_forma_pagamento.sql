-- Migration: forma de pagamento nos movimentos de caixa
-- Cada entrada/saída manual passa a ter forma de pagamento. Só 'dinheiro' afeta
-- o caixa físico (gaveta); as demais (pix/transferência/boleto/cheque) ficam
-- registradas no histórico financeiro, mas fora da conta da gaveta.
-- Lançamentos existentes viram 'dinheiro' (comportamento atual). Projeto "sistema VJA".

alter table public.cash_movements
  add column if not exists forma_pagamento text not null default 'dinheiro'
    check (forma_pagamento in ('dinheiro','pix','transferencia','boleto','cheque'));
