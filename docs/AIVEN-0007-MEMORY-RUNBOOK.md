# Execução 0007 — memória pessoal (staging Aiven somente)

**Proposta para auditoria; nenhuma migração foi executada por este PR.** O arquivo `0007_learner_memories.sql` já está na `main`. Este PR adiciona exclusivamente um runner manual controlado, usando os GitHub Actions secrets já destinados ao Aiven de testes. Não escreve nem consulta dados pessoais de alunos.

## Pré-requisitos
1. Aprovação da auditoria desta PR pelo fundador e Deep. CI verde. Nunca usar `db:push` nem algum runner de bootstrap em banco já povoado.
2. **Verificar em Aiven um backup/snapshot restaurável do banco correto**, registrar ID/horário em local privado e confirmar proteção TLS/CA. A declaração de backup no workflow é uma confirmação humana, **não prova técnica de backup**.
3. GitHub Actions (somente branch `main`): **Lingua Aiven memory 0007 (manual guarded)** → Run workflow → `action=inspect`; demais campos vazios. Conferir saída `READ-ONLY 0007 INSPECTION COMPLETED`, `learnerMemories status: absent` e que as tabelas de `0005` e `0006` foram encontradas.
4. Apenas se inspecionado e aprovado, disparar `action=apply`, `confirmation=APLICAR_0007_MEMORIA_SOMENTE_LINGUA`, `backup_confirmation=BACKUP_AIVEN_CONFIRMADO`. Exigir `0007 APPLIED AND VERIFIED`. O script recusa banco diferente, ausência do CA TLS, versão fora de MySQL 8.4, dependências ausentes, tabela existente, confirmação incorreta ou chamada fora de `workflow_dispatch` em `main`.
5. **Não repetir após erro de DDL.** MySQL executa commits implícitos. Investigar parcialmente criado antes de qualquer rollback.
6. Depois, deploy manual **somente no serviço Render de staging confirmado**. Ativar `LINGUA_TUTOR_MEMORY_ENABLED=true` somente com QA de migração, sessão e exclusão. Testar: negar consentimento, autorizar uma memória, recarregar e lembrá-la, apagar uma, apagar todas, isolamento entre contas e nenhum fato inventado.
7. O fluxo é independente de Stripe e CSLE. Não usar produção nem ativar faturamento.

**Limitação operacional:** O conector GitHub disponível para o assistente não oferece o despacho de GitHub Actions. Um operador autorizado precisa rodar o workflow pelo navegador depois do merge auditado deste runner.
