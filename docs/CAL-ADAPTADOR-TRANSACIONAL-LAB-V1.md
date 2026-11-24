# Lingua — Desenho do adaptador transacional de observações (laboratório v1)

**Status: desenho e simulador de transações; NÃO existe adaptador MySQL, tabela, endpoint, migration ou gravação efetiva.**

Este documento complementa [o gate de observações](./CAL-PERSISTENCIA-PEDAGOGICA-LAB-V1.md) e [o ciclo de vida consentido](./CAL-CONSENTIMENTO-REVOGACAO-LAB-V1.md). O código `server/learning-evidence-transaction-adapter-lab.ts` é um **test double** em memória para testar o contrato, não uma implementação produtiva.

## 1. Semântica que o banco DEVERÁ oferecer

A unidade transacional exige as seguintes propriedades **ao mesmo tempo**:

1. O usuário deve ser autenticado pelo servidor. O ID da conta não pode vir de uma declaração livre do navegador.
2. Para cada conta, serializar **todas** as mutações relevantes: outorga, proposta, revogação, expurgo e exclusão. Consentimento e tentativa precisam participar do mesmo bloqueio (por exemplo, bloquear a linha de estado `learnerEvidenceControl` por `user_id`).
3. Reconsultar **dentro** da transação o consentimento atual e sua versão/prazo; não confiar em um `currentConsent` recebido com a proposta ou em cache de memória.
4. Usar hora confiável do servidor/banco; vincular a proposta a ticket válido, versão da tarefa, estágio, contexto e receipt registrado pelo servidor. O receipt do cliente é somente alegação de apresentação do DOM.
5. Rodar novamente `gateLearningObservation` na mesma transação e gravar somente projeção por allowlist se o resultado for `provisional_only`. Nenhuma resposta bruta, áudio, transcrição, perfil, memória ou nota CEFR.
6. Validar chave idempotente; duplicata exata retorna o registro existente sem nova escrita, colisão com tentativa/resultado diferente é rejeitada. Garantir índice único de verdade, **não apenas `find()` na aplicação**.
7. Incrementar revisão monotonamente em todo commit que altera consentimento/observações; tentativas com revisão antiga recebem `stale_revision` e reavaliam sob novo consentimento se reexecutadas.
8. Revogar ou apagar exige exclusão atômica dos candidatos relacionados **na fonte primária** antes de confirmar sucesso de exclusão; não ressuscitar dados por retry/outbox/cache. Backups e réplicas exigem política separada e reconciliação real.
9. Erros antes do commit devem produzir rollback integral. Uma chamada pode sofrer resultado indeterminado após commit mas antes da resposta HTTP: repetir com mesma chave idempotente, nunca inserir novamente.
10. Não expor função administrativa de gravação sem controles dedicados de autorização e auditoria. Nunca usar o simulador como rota do tutor.

## 2. Transações propostas (pseudocódigo, NÃO executável no Aiven)

```text
BEGIN TRANSACTION
  SELECT control FOR UPDATE WHERE user_id = authenticated_user
  -> se não existe, provisionar controle com atomicidade e unique(user_id)
  -> usar clock do DB, policy version e consentimento armazenado
  -> validar expectedRevision, requestId, finalidade e dono da tarefa
  -> se propose:
       obter receipt/tarefa imutáveis na mesma leitura consistente
       gateLearningObservation(candidate_from_server, trusted_context)
       INSERT allowlisted_provisional_observation ... ON CONFLICT deterministic
  -> se revoke/erase:
       invalidar consentimento, remover todas observações provisórias da conta
       incrementar revisão e proteger contra reprocessamento posterior
  -> se grant:
       exigir nova autorização explícita, não reaproveitar texto antigo
  UPDATE control SET revision = revision + 1
COMMIT
```

**Não usar `ON DUPLICATE KEY UPDATE` para sobrescrever resultado de tentativa**; replay idêntico deve ser tratado como duplicata, divergência como violação de integridade.

## 3. Limites do simulador atual

`SimulatedEvidenceTransactionAdapter`:
- Mantém um `Map<userId, EvidenceLabLedger>` em um único processo Node, com fila por usuário e estado clonado.
- A fila simula serialização apenas neste processo, **não** locks entre Render workers, banco, processos, retries ou múltiplas regiões.
- Usa `stepEvidenceLab`, que também é um modelo sem operações de banco. Seu `revision` simula compare-and-swap.
- O hook de teste `after_read` / `before_commit` permite injetar falhas e simular uma operação bloqueada. Antes do commit em memória não há efeitos parciais; exceções liberam a fila.
- A assinatura `execute(authenticatedUserId, command)` assume que o argumento foi obtido de contexto autenticado pelo chamador de teste; **não autentica requisições HTTP**.
- Nenhuma persistência sobrevive ao reinício do processo. Nenhuma exclusão de backup, cache ou base externa acontece.

Este é um contrato verificável por testes sintéticos, **não é comprovação de atomicidade real MySQL**.

## 4. Roteiro de homologação futuro, com banco isolado

Executar em banco descartável, sem dados de alunos e com migração explicitamente revisada:

| ID | Cenário | Condição de aprovação |
| --- | --- | --- |
| SQL-01 | Dois inserts simultâneos para a mesma tentativa | Um único registro; segundo idempotente ou conflito, sem duplicar |
| SQL-02 | Revogar enquanto há resposta pendente | Nenhuma escrita após revogação confirmada |
| SQL-03 | Falha/timeout após commit antes de HTTP | Retry mesma idempotency key não duplica |
| SQL-04 | Excluir e reconsentir | Nunca restituir observações anteriores |
| SQL-05 | Duas contas e múltiplos processos | Sem leitura/escrita cruzada |
| SQL-06 | Transação abortada após bloqueio | Rollback integral e liberação de locks |
| SQL-07 | Expiração de consentimento durante requisição | Reavaliar pelo clock do DB antes da gravação |
| SQL-08 | Reiniciar serviço entre etapas | Estado somente reaparece se legitimamente persistido; nada de falso mastery |
| SQL-09 | Incidente de backlog, backup ou réplica | Não restaurar dados sujeitos à exclusão; trilha de reconciliação |
| SQL-10 | Cliente adulterado envia origem `typed` forjada | Não classificar como evidência oficial, mesmo com metadata de tarefa |

## 5. Rollback seguro e exclusão

**Antes de deploy:** criar migration **aditiva e reversível** somente em PR futura, com backup verificado, sem `db:push` automático. Flag de leitura/desativação inicialmente **OFF**. Sem rotina de backfill a partir de chat, SRS ou CAL volátil.

**Em incidente:** primeiro desligar a flag de escrita, manter o módulo de revogação/exclusão ativo, registrar janela afetada com mínimo de metadados, desabilitar fila e drenar requisições. Preferir correção para frente antes de excluir tabelas que contenham direitos de exclusão pendentes.

**Exclusão:** definir fonte de verdade, réplicas, índice de busca, caches, exportações e cronograma de backup; implementar marcador de supressão/tombstone transacional adequado e cumprir a política de retenção aprovada. O teste em memória que esvazia `observations` **não** comprova deleção total.

**Retenção:** parâmetros de 7/30 dias nos laboratórios são apenas exemplos técnicos, **não uma política aprovada ou decisão LGPD**.

## 6. Portões bloqueantes

- Escolher política de dados/retention/opt-in específica e suas telas; decidir com produto e privacidade antes de criar schema.
- Atender consentimento revogável, exclusão verificável, política de menores, controlador/processadores, logs e backups.
- Projetar atestação de origem de ASR. `client_text_claim` não prova texto digitado nem independência.
- Executar QA navegador autenticado em duas contas, render ACK, voice, reload e cold start.
- Comparador CAL versus tutor sem CAL; nenhuma alegação de eficácia antes de resultados.
- O fundador poderá autorizar uma PR de migration **após** revisão do desenho, sem ativar escrita automaticamente.

**Situação ao criar este documento:** somente contratos, testes e um simulador sem banco; sem deploy no staging e sem dados de alunos.
