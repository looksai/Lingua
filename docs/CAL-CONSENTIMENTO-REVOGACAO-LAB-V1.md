# Lingua — Laboratório de ciclo de vida de consentimento e observações v1

**Status:** especificação executável, isolada, sem uso por alunos. **Nenhuma tabela, migration, endpoint, escrita, mudança de flags, Render ou CSLE.**

## Objetivo

A [PR #58](https://github.com/looksai/Lingua/pull/58) criou um gate puro para candidatos de observação pedagógica. Esta etapa acrescenta um **simulador imutável** de transições que ajuda a descobrir falhas de desenho **antes** de implementar um adaptador de banco. Os módulos envolvidos são `server/learning-evidence-lab.ts` e `server/learning-evidence-lifecycle-lab.ts`.

Um registro provisório **não é** `learnerEvidence`, comprovação de domínio, nota CEFR, avaliação de pronúncia, certificação ou agenda SRS. O Lingua conserva autoridade exclusiva sobre currículo, consentimento e eventual registro oficial.

## Estados e transições

| Comando | Efeito apenas no simulador | Regra de segurança |
|---|---|---|
| `grant` | registra aceite para finalidade pedagógica específica | usuário autenticado, política v1, horário emitido pelo servidor, versão esperada, prazo |
| `propose` | inclui **somente projeção provisória permitida** pelo gate anterior | consentimento corrente do ledger, receipt vinculado, conta certa, janela de tempo, modalidade; não confia em consentimento que vem do comando |
| `revoke` | marca o consentimento revogado e zera observações na memória | versão CAS, bloqueia resposta atrasada |
| `erase` | zera consentimento e observações, incrementando revisão mesmo vazio | não restaura gravação, áudio, classificação ou histórico |
| `prune` | remove metadados antigos e limpa dados de consentimento expirado | não renova autorização nem modifica avaliações |

A revisão `revision` é um **modelo de compare-and-swap**: dois comandos que leram a mesma revisão não podem ser aplicados ambos ao mesmo estado atualizado. Uma tentativa repetida com exatamente a mesma projeção é considerada duplicada; mesma chave com resultado diferente é conflito, jamais sobrescrita silenciosa.

## Limites temporais de laboratório — NÃO aprovados como política de produto

- `LAB_PROVISIONAL_RETENTION_MS`: 7 dias.
- `LAB_CONSENT_MAX_DURATION_MS`: 30 dias.

Esses números servem **somente para exercitar casos de borda**. Não representam uma decisão sobre retenção real, LGPD, finalidades contratuais, pedidos de exclusão ou backups. Devem ser discutidos com produto/privacidade antes de virar requisitos de armazenamento.

## Tratamento de privacidade

- A projeção já minimizada não inclui texto de chat, resposta, e-mail, áudio, transcrição, histórico, voz, nome ou biografia.
- Os comandos só aceitam IDs e metadados tipados; o gate anterior também remove campos extras em runtime.
- A implementação de laboratório **não chama** o aplicativo nem recebe dados reais.
- Revogação apaga o conjunto em memória do simulador, mas **não comprova remoção do banco, cache, índice, logs, cópias ou backup**, pois esses sistemas não foram implementados.
- Consentimento em conversa/voz/memória pessoal **não** substitui aceite para esta finalidade; alterar o proprietário da conta bloqueia a operação.
- `client_text_claim` ainda não é proveniência assinada pelo servidor; nenhuma saída certifica ou altera progresso oficial.

## Portões antes de qualquer migração

1. **Autenticação e consentimento**: construir transação real que confira sessão autenticada e reconsulte o consentimento vigente na mesma unidade serializável de escrita; revogação e inserção devem competir pelo mesmo bloqueio.
2. **Índices e idempotência**: chave única por usuário + tentativa gerada pelo servidor; colisões são rejeitadas. Definir IDs estáveis, sem assumir IDs inventados pelo cliente.
3. **Retenção e expurgo**: estabelecer política de prazo por finalidade e tratamento de legislação/contas de menores, configurar expurgo atômico dos registros e reconciliação de réplicas/backups.
4. **Direito à exclusão**: especificar deleção completa, logs mínimos, exportação, prova de exclusão e auditoria de falhas.
5. **Threat model de origem**: testar cliente adulterado, transcrição ASR com token de servidor, reenvio entre contas, mudança de prompt e relógios; não declarar avaliação fonética.
6. **Revisão de produto**: definir texto de aceite separado, retenção e necessidade de persistência antes de qualquer `db:push`, Drizzle migration ou liberação de flag.
7. **QA autenticado**: duas contas, duas abas, consentimento revogado com resposta em trânsito, processo reiniciado, restore, falhas de rede e apagamento confirmado no banco.

## Evidência desta etapa

Testes determinísticos em `server/learning-evidence-lifecycle-lab.test.ts` cobrem opt-in explícito, ausência de consentimento, duplicidade/idempotência, alteração maliciosa de tentativa, corrida de revisões, revogação durante operação pendente, reconsentimento, prazo, expiração, exclusão e manutenção de `officialLearningEvidence:false`.

**Conclusão permitida:** o modelo lógico passa pelos testes sintéticos de regras. **Conclusão proibida:** o Lingua já persiste o progresso ou consegue executar exclusão real e atomicidade entre servidores.
