# Fase 01 Naruto — Laboratório de contrato de observações pedagógicas

**Status em 24/11/2026:** contrato puro + testes. **NÃO HÁ** persistência implantada, rota, tabela, migração, alteração SRS/CSLE ou certificação. O arquivo `server/learning-evidence-lab.ts` é uma especificação executável de recusa e projeção de metadados, não uma implementação de banco de evidências.

## 1. Autoridades e diferenças inegociáveis

- **Lingua:** único proprietário de currículo oficial, consentimento, registro autorizado de observações, governança de evidências e eventual certificação.
- **Naruto/CAL:** identifica um objetivo e propõe atividades/candidatos de resposta; não certifica habilidade nem gera domínio oficial.
- **SRS:** agenda revisão; o estado `review` e a nota `good` não significam domínio.
- **CSLE:** componente independente de pesquisa; nesta fase não consome nem produz registros oficiais.
- **ASR:** transcreve áudio; sem auditoria de proveniência e avaliação acústica separada, não pontua pronúncia.
- **Histórico do chat:** não equivale a observações; transcrição, mensagem do LLM e autodeclaração não são gabarito pedagógico.
- **Receipt do DOM:** relata atividade visível na interface, não comprova leitura humana. O cliente é um ator não confiável e pode forjar dados.

## 2. Quatro camadas de dados que não podem se misturar

| Camada | Exemplo | Persistência agora | Autoridade |
|---|---|---|---|
| Conversação e memória pessoal | profissão dita pelo usuário, histórico local | mecanismo específico opt-in existente | usuário, nunca certificação |
| Estado CAL volátil | fase ENSINAR, ticket, observações sintéticas | somente processo Render e TTL; sem restore oficial | hipótese de controle do tutor |
| Projeção candidata de observação | metadados consentidos e sem conteúdo livre | **não persiste** neste laboratório | avaliação provisória, não domínio |
| Evidência oficial | tarefa confiável com proveniência, avaliação validada e política | **não implementada** | Lingua sob governança própria |

Um `meets` no catálogo, ainda que com `assessor:"rule"`, nunca altera `officialLearningEvidence:false`, `mastery:false` ou `certification:"not_assessed"`.

## 3. Contrato lógico de candidatura (não um endpoint)

`gateLearningObservation(candidate, trustedServerContext)` devolve:
- `rejected`: faltam condições de consentimento, autenticação, integridade, versão, janela de tempo, recibo ou origem;
- `review_required`: avaliação que exige rubrica/revisor independente, como contexto de transferência aberto ou avaliador que não é regra;
- `provisional_only`: somente atividade fechada explicitamente catalogada, resposta originada como declaração textual e metadados coerentes; **não comprova digitação independente** ou domínio.

A saída provisória é uma **projeção por allowlist** que não copia texto, nome, e-mail, resposta, áudio, pronúncia, memória, documentos nem conteúdo do prompt. IDs e metadados devem ser gerados/validados pelo servidor.

**IMPORTANTE:** `client_text_claim` continua sendo rótulo informado pelo cliente. Isso não é atestado criptográfico ou evidência verificada. Portanto **não ligar a nenhum insert** no banco antes da especificação de atestação e da revisão de segurança.

## 4. Preparação para futura persistência (proposta; NÃO executar)

Qualquer futuro desenho Drizzle/Aiven/MySQL deve receber PR de migration separada e revisão do banco, com:
- tabela distinta para **consentimento de observações**: `consentId`, `userId`, finalidade e versão, `grantedAt`, `revokedAt`, expiração, provenance e termos;
- tabela distinta de **observações provisórias**, com chave de idempotência por usuário/sessão/tentativa; status `provisional_unverified` e rubrica/versão;
- tabela de evidência oficial, **não criada ainda**, somente quando existir política de validação, revisão e consentimento efetivos;
- chaves estrangeiras a contas, índices exclusivos, controles de acesso, auditoria de consentimento, deleção e tempo de retenção por finalidade;
- desenho de **replay e concorrência**: idempotência por transação, compare-and-swap de versão, verificação do consentimento dentro da mesma transação e nenhum write após revogação;
- reset, exportação e exclusão por aluno: eliminar observações e índices associados, abrangendo backups segundo política e obrigações jurídicas;
- proteção de transcrições: token atestado na rota de ASR poderia afirmar fonte/tempo/hash do conteúdo, mas **não** precisão fonética; verificar ameaça de cliente adulterado antes de aceitar sinais como independentes;
- políticas explícitas para menores, administradores, dados sensíveis, processamento externo, retenção e minimização de logs.

**Bloqueador de produto:** a definição de finalidade e retenção, as telas de opt-in e a exclusão verificável precisam ser auditadas antes de adicionar persistência de observações. A aprovação do laboratório **não é** autorização para migrar Aiven, ativar uma flag ou passar a guardar dados.

## 5. Portões de QA e métricas

1. Testes determinísticos de consentimento ausente, expirado, revogado, de outra conta e com versão de política divergente.
2. Recusa de dados pré-consentimento, clock inválido, task ID/versão/contexto inválidos e recibo forjado.
3. Distinção `asr_transcription` / `unknown` / `client_text_claim`; somente rótulo textual não atribui domínio.
4. Tarefa aberta `open_transfer` e `llm_candidate` exigem revisão e **nunca** têm projeção automática.
5. Filtros de allowlist bloqueiam conteúdo pessoal embutido ou campos extras; não há gravações/áudios.
6. Matrizes combinatórias: nenhuma combinação de origem, ajuda e resultado gera certificação, domínio ou evidência oficial.
7. Futuro QA com duas contas reais autenticadas, reinício do Render, consentimento revogado durante execução, concorrência, idempotência e fluxo de deleção completo.
8. Futuro comparador pedagógico Naruto com/sem CAL e retenção tardia aferida em tarefas não memorizadas — nenhum destes experimentos foi executado.

## 6. Próxima decisão de engenharia

Depois do CI verde, integrar **somente** contrato e testes no repositório como módulo de laboratório inerte. Em seguida, avançar desenho de autoridade de consentimento/registro sem criar tabela produtiva, e priorizar QA interativo real e modelo de rubrica. Documentar todos os commits e bloqueios em [STATUS-ATUAL-DESENVOLVIMENTO.md](./STATUS-ATUAL-DESENVOLVIMENTO.md).

**Nenhuma alegação de eficácia ou cumprimento integral da Fase 01 se apoia nesses testes sintéticos.**
