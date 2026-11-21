# Especificação de sincronização offline

## 1. Fonte da verdade

`reviewLogs` é o registro append-only da intenção operacional do estudante. O estado mutável `userKnowledgeStates` é um cache materializado que deve ser reconstruível pela aplicação ordenada dos logs, começando em `createInitialReviewState`. Essa decisão reduz conflitos de estado: em caso de divergência, a reconstrução a partir dos logs é a referência e o estado materializado pode ser recalculado.

A reconstrução deve ordenar por `clientTimestamp`/tempo de recebimento estável e, em empate, por `operationId`. Neste checkpoint o banco ainda não armazena esses dois identificadores; portanto a reconstrução server-side completa fica registrada como dívida P0 residual e não é simulada como resolvida.

## 2. Fila

`client/src/lib/offline-learning.ts` enfileira somente `save`, `review` e `remove`, com payload mínimo, `operationId`, `clientKey` quando necessário e `createdAt`. Não entram transcrições, autoavaliações, decisões pedagógicas, áudio ou dados destinados automaticamente ao CSLE.

A fila é reproduzida em ordem e remove uma operação somente depois da confirmação da procedure correspondente. Operações duplicadas com o mesmo `operationId` são deduplicadas no armazenamento local. O replay é, portanto, at-most-once no cliente, mas sem uma chave persistida no servidor ainda não pode garantir at-most-once contra uma resposta perdida após o servidor gravar.

## 3. Idempotência

A forma completa planejada é `(userId, operationId)` como chave única no servidor, com o log e a atualização de estado dentro da mesma transação. Como este checkpoint não pode mudar assinaturas tRPC nem aplicar migração de banco, a implementação entregue cobre a geração estável/eliminação de duplicatas na fila e expõe a função pura de equivalência para reconstrução. O servidor-side idempotency key permanece dívida explícita.

## 4. Expiração

Operações com mais de 30 dias são descartadas ao ler/normalizar a fila. A justificativa é evitar aplicar revisões antigas contra um estado já reconstruído ou removido; a perda é visível apenas como operação pendente que não será mais reproduzida, e não como evidência pedagógica. O contador da interface reflete a fila após a poda.

## 5. Múltiplas abas

A fila usa evento local para atualização visual. A reprodução deve ser assumida por uma única aba por vez; neste checkpoint não há lock distribuído. `storage`/eventos customizados atualizam contadores, mas duas abas ainda podem iniciar replay simultâneo. Isso permanece limitação documentada para o próximo checkpoint; a solução planejada é `BroadcastChannel` com lease curto.

## 6. Criptografia

A criptografia local não entra neste checkpoint. A fila contém apenas payloads de aprendizagem mínimos, mas `localStorage` não é considerado cofre. Criptografia, rotação de chaves e recuperação são dívidas explícitas.

## 7. Nota de implementação proposta após recuperação do código — 20/11/2026

Esta seção registra um **rascunho ainda não aprovado em produção** e não modifica a governança das seções anteriores. Os itens de dívida acima descrevem o checkpoint histórico anterior do Manus. O patch GPT de P0 propõe:

- Chave de fila individual por `userId` autenticado (`lingua.learning.pending.v2.user.<id>`), sem atribuir a fila global v1 a uma conta arbitrária.
- `operationId` estável desde a primeira tentativa de revisão; idempotência em `reviewLogs` por `(userId, operationId)` no servidor, condicionada à execução da migration e aos testes MySQL.
- Rebind atômico de `clientKey → knowledgeItemId` no storage após ACK do save; uma revisão sem ID confirmado **interrompe** a fila e não é descartada.
- Reconstrução de `userKnowledgeStates` permitida somente para logs atribuídos com segurança ao ciclo de save atual; história legada não atribuível fica bloqueada, não é inferida.
- A hora usada nas transições novas é determinada pelo servidor; `appliedAtMs` dá ordenação e a identidade de operação evita reaplicação.

**Restrições inalteradas:** nada disso prova domínio ou certifica. Não há lock entre abas, criptografia da fila, garantia de durabilidade sob falha do `localStorage`, nem tratamento automático para logs legados. Toda migração e validação integrada permanecem dependentes de revisão humana.
