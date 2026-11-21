# Lingua — acompanhamento Git / proposta P0

- **`main`**: importação recuperada do sandbox Manus, higienizada somente para Git (sem credenciais ou artefatos de build).
- **`fix/p0-auditada`**: proposta de correções P0 do GPT; não fazer merge sem auditoria Deep e aprovação do fundador.
- **Migration `drizzle/0002_p0_review_idempotency.sql`**: arquivo em revisão; **não aplicada** em produção nem em banco de teste. Validar explicitamente em MySQL descartável antes de liberar.
- Os testes locais isolados foram relatados no documento `docs/P0-IMPLEMENTACAO-GPT-PARA-DEEP.md`. Não equivalem à validação integral.
- Workflow GitHub Actions `p0-checks.yml` executa instalação, `pnpm check`, `pnpm test`, `pnpm build`; executado com 49/49 testes no commit 28acac0. Não conecta a banco de produção.
- CSLE não foi integrado; currículo, consentimento, evidência e certificação continuam sob governança do Lingua/estudante.

## Validação na nuvem
Consulte [GUIA-BANCO-NUVEM.md](GUIA-BANCO-NUVEM.md). Não há Docker local. O workflow test-migration.yml usa apenas MySQL 8 descartável do runner e inclui verificação real da migration 0002 e concorrência. Execução ainda sujeita ao resultado do CI. A regra do hard no último passo de learning foi atualizada sem alterar os passos curtos. Nenhum merge autorizado.
