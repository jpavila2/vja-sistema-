# MVP Sucata — Índice dos Planos de Implementação

Spec de origem: `docs/superpowers/specs/2026-05-30-sistema-sucata-mvp-design.md`

O MVP (Fase 1) foi quebrado em 4 planos sequenciais. Cada um entrega software que roda e
é testável por si só. Execute na ordem.

| # | Plano | Entrega testável | Arquivo |
|---|-------|------------------|---------|
| 1 | Fundação + Auth | App Next.js sobe; login funciona; perfis e RLS no Supabase; base de testes verde | `2026-05-30-mvp-fase1-01-fundacao-auth.md` |
| 2 | Materiais + Pessoas (CRM) | Cadastrar/listar/editar/buscar materiais e pessoas | `2026-05-30-mvp-fase1-02-materiais-pessoas.md` |
| 3 | Compras + Estoque | Lançar compra touch com vários itens; estoque sobe via `stock_movements` | `2026-05-31-mvp-fase1-03-compras-estoque.md` |
| 4 | Conferência + Caixa + Painel | Conferir/cancelar compras; caixa do dia automático; painel admin | `(a escrever ao iniciar o plano 4)` |

**Convenção de execução:** cada plano usa `superpowers:subagent-driven-development` ou
`superpowers:executing-plans`. Passos com checkbox `- [ ]`.
