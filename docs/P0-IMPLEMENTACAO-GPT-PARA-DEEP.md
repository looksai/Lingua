# Lingua — proposta de correção P0 para auditoria independente do Deep

**Data:** 20/11/2026. **Estado:** código em ZIP isolado, **NÃO** validado contra MySQL, tRPC real ou aplicativo React completo. **Sem commit, push, deployment, migração aplicada ou integração CSLE.** O ZIP original `lingua.zip` é a fonte de recuperação, não foi modificado. Não alegar P0 aprovado ainda.

## Contexto e autoridade

Lingua governa currículo, patrimônio oficial de aprendizagem, consentimento, registro de evidências e qualquer certificação. SRS agenda retorno, **não** prova domínio. O CSLE continua independente e fora do escopo desta versão. `docs/srs-spec.md` **não foi alterado**. Esta é uma entrega para Deep e fundador auditarem antes de um commit ou aplicação em banco.

## Alterações de código

### 1. Idempotência server-side — implementação sujeita a validação MySQL

- `learning.review` aceita **somente** o novo campo obrigatório `operationId` além dos campos existentes.
- A primeira tentativa online cria um ID de operação estável; retries reutilizam o mesmo ID, inclusive após perda de ACK.
- `reviewLogs` ganha índice único `(userId, operationId)`, `resultJson` (ACK original), `stateId` e `appliedAtMs` para replay rastreável.
- `recordKnowledgeReview` utiliza transação e lock pessimista `FOR UPDATE` no estado de usuário+item, verifica a operação antes e após o lock, grava atualização e log no mesmo commit, devolve ACK original a retries de intenção idêntica e rejeita reuso com item/rating diferente.
- Migration **aditiva** `drizzle/0002_p0_review_idempotency.sql`; linhas legadas recebem `legacy-<id>` para cumprir unicidade. Isto **não** retroativamente cria idempotência ou prova de atribuição para revisões legadas.
- A migration foi produzida e verificada estaticamente, **não executada**. O MySQL pode fazer DDL com commits implícitos; restaurabilidade e backfill exigem ensaio separado.

### 2. Reconstrução determinística — manutenção explícita, falha fechada no legado

- `replayReviewLogs` aceita o mesmo `userId/itemId` usado no jitter produtivo, e ordenação por sequência de commit quando fornecida; suporta arredondamento do EF para FLOAT32 no replay persistente.
- `reconstructPersistedKnowledgeState(userId,itemId,write=false)` roda em transação, bloqueia estado corrente, restringe logs ao `stateId` do ciclo de save vigente, reproduz as transições e compara; com `write=true` corrige o cache persistente sem criar log de avaliação.
- Logs legados sem `stateId`/timestamp e ciclos não comprovados provocam erro. Não se inventam provas de pertencimento a um ciclo após `remove/re-save`.
- Horário de aplicação novo é atribuído pelo servidor e reduzido para segundos para corresponder ao tipo `timestamp` MySQL atual; timestamp real em milissegundos é armazenado no log.
- **Não** há reconstrução automática/deployment deste serviço. Validação de equivalência em MySQL de teste e política para logs legados ainda são gates obrigatórios.

### 3. Isolamento de fila offline — implementação local

- Fila em `lingua.learning.pending.v2.user.<userId>`; uma conta nunca lê a fila de outra.
- Fila v1 global antiga **não é atribuída automaticamente a uma conta**. Preservada sem leitura para evitar vazamento; recuperação posterior exige identificação segura do proprietário.
- Falha do `localStorage` mantém operações no processo via memória volátil, sem prometer durabilidade após fechar o browser.
- No React, a lista de itens/cache autenticado é limpa e refetchada ao trocar o usuário antes de reidratar dados na interface. Revisar manualmente no navegador, especialmente cancelamento de requests em voo.

### 4. Falsa sincronização e perda de referência — implementação local

- ACK de `save` religa todas as revisões/remoções dependentes ao ID do servidor em **uma** gravação do storage, removendo o save confirmado no mesmo passo.
- Se ainda faltar ID confirmado, o replay **interrompe e mantém o restante da fila**; nunca pula uma revisão para declarar sincronização.
- Save cujo erro chegou depois de uma revisão dependente é inserido antes dessa revisão.
- `replayPendingLearningOperations` protege contra duas execuções simultâneas na mesma instância JS. **Não** implementa lock entre abas; essa dívida continua P1.
- Os componentes ReadingLab e ReviewDeck transmitem o mesmo ID de operação na primeira tentativa e nos reenvios.

### 5. Conteúdo compartilhado — isolamento por chave privada

- `learning.saveItem` encaminha o `ctx.user.id` interno ao repositório. O backend deriva uma chave `learner:<sha256(userId + NUL + itemKey)>` para qualquer item enviado pelo estudante.
- O upsert **não atualiza campos** de itens existentes; não pode reescrever tradução, texto, fonte, licença ou âncoras da base comum. A fonte comum antiga permanece preservada.
- Esse isolamento gera cópias privadas de metadados ao salvar, portanto pode gerar duplicidade ao implantar sobre contas que já tinham vínculos com linhas do catálogo antigo. **É necessário ensaio de migração/conciliacão antes de produção**. A política do catálogo coletivo precisa de revisão do Deep antes de evoluir para ingestão de fontes adicionais.

### Alinhamento SRS sem mudar a especificação

- `again` no estado `relearning` continua em `relearning`, sem incrementar novo lapso: adequação textual ao §5. `easy` 4 dias e `hard` 1.2 na fase `review` **já estavam implementados** e foram preservados.
- A interpretação de `hard` no último passo de `learning` permanece um ponto a resolver com Deep, pois a spec contém as expressões `hard repete passo atual` e `a próxima resposta não-again promove`. **Não reescrevemos a spec** nem prometemos que essa divergência foi eliminada.

## Verificação realizada nesta sessão

- `node scripts/verify-p0-isolated.cjs` — **13/13 casos passaram**, usando TypeScript estrito e `node:test`, sem dependências externas. Cobrem isolamento entre contas, retries com mesmo ID, ACK perdido, rebind após falha, parada segura sem ID, ordem após falha tardia, storage quota, deduplicação, jitter, relearning, easy/hard, chave privada e single-flight no mesmo processo.
- Análise sintática dos arquivos TypeScript/TSX (sem resolver imports): **115 arquivos não-declaração analisados, nenhum erro sintático**. Isso **não é** um typecheck de projeto.
- `pnpm check`, `pnpm test` (Vitest completo), `pnpm build`: **não executáveis**, `pnpm: command not found`; dependências externas e banco MySQL não instalados, sem acesso ao registry no ambiente anterior.
- Migration, locking, replay persistente, cache React e dupla tentativa real tRPC são **não validados**. Não afirmar que houve 39 testes Vitest aprovados; além da suíte antiga, o novo `server/p0-offline-integrity.test.ts` contém testes adicionais ainda não executados com Vitest.

## Riscos residuais antes do merge

1. **Bloqueante:** instalar as dependências exatas do lockfile e executar `pnpm check`, `pnpm test`, `pnpm build` numa cópia isolada. Corrigir erros reais encontrados; não presumir compilação de backend.
2. **Bloqueante:** aplicar migration e testar rollback/restauração em MySQL de teste com logs legados, falha intermediária e índices; **nunca** executar diretamente em produção sem snapshot e aprovação.
3. **Bloqueante:** teste integrado com duas revisões concorrentes (mesma e diferentes `operationId`), colisão de intenção, perda de ACK, re-save após remove, equivalência SRS em FLOAT, estado pós-migração e reconstituição. Reavaliar lock MySQL sob isolamento real.
4. **Bloqueante:** QA de troca rápida de conta, `auth.me` expirar durante replay, cache React de outro usuário, sessão sem auth e fila offline após reiniciar. A política global de redirecionamento no erro de autenticação ainda pode prejudicar prática local.
5. **Bloqueante para uso real:** política de migração das linhas compartilhadas legadas para chave privada (para evitar duplicatas e histórico dividido). Metadados de usuários não ficam editáveis em linha após primeiro save; revisar UX.
6. **P1:** lock entre abas, criptografia local, cache persistente de áudio, reconciliação de fila global antiga, exportação completa/consentida, truncamento de históricos, retenção e segurança de longo prazo.
7. **P1:** `timestamp` do MySQL pode não representar datas próximas/acima de 2038 em alguns modos, apesar do SRS permitir intervalo de 3650 dias. Auditar tipo de datas antes do rollout de longo prazo.

## Ritual exigido para o próximo executor (sem rodar em produção)

1. Salvar e versionar o ZIP original `lingua.zip`. Conferir SHA e Git remoto verdadeiro; este ZIP **não contém `.git`**, SHA `9fb6ebb` é relatado, não comprovado.
2. Instalar pnpm/dependências do `pnpm-lock.yaml` com fonte confiável.
3. Executar `pnpm check && pnpm test && pnpm build` e registrar outputs completos. Se falhar, devolver o erro e não declarar P0 aprovado.
4. Com aprovação de Deep/fundador, aplicar `0002` **apenas em clone do banco**, com backup externo; testar query de estado/log, regressão e reconstrução controlada.
5. Validar navegador offline, autenticação/alternância de contas, roteamento e sincronização; só então preparar commit em branch de checkpoint. `git diff --check`, revisão do Deep, aprovação humana, merge sem force-push.

**Decisão recomendada:** enviar este ZIP ao Deep como **proposta de correções P0**, não como release implantável. Mantém-se a independência do aplicativo e do CSLE.
