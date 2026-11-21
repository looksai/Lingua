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
