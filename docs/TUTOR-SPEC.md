# Lingua — Especificação do Tutor Proativo (Fase C)

**Versão:** proposta 0.1 | **Data:** 21/11/2026 | **Status:** **PROPOSTA PARA AUDITORIA — NÃO IMPLEMENTAR**
**Governança:** requer aprovação explícita do fundador e do auditor Deep. A implementação e o acoplamento CSLE estão fora deste documento.

## 1. Missão, não-negociáveis e limites

O tutor é o **agente de experiência pedagógica** do Lingua. Conduz conversas com conteúdo, explica, oferece oportunidades de prática, acompanha revisão e motiva com respeito. Não é apenas uma janela de chat e não é autoridade sobre currículo, notas, proficiência, consentimento ou certificados.

- **Nome:** escolhido pelo aluno, mutável, com padrão neutro («seu tutor»). Não ressuscitar Welma como identidade obrigatória.
- **Personalidade:** estilo escolhido pelo aluno: acolhedor, direto, explorador ou neutro; configurações de humor, formalidade, intensidade de correções e ritmo. Núcleo pedagógico, segurança e honestidade não são personalizáveis.
- **Iniciativa:** começa conversas pertinentes **na sessão ativa**, dentro de regras determinísticas e aceites; não envia notificações espontâneas fora do aplicativo por padrão.
- **Voz opcional:** fala e ouve com autorização explícita; funciona plenamente por texto; o aluno pode mudar de modo no meio da sessão.
- **Memória mínima, inteligível e controlada pelo aluno.** Não tentar interpretar estados clínicos, sentimentos profundos, intenções ocultas ou criar vínculo dependente.
- **Progresso real:** LLM não escreve o patrimônio oficial. O Lingua valida evidência e estado.
- **CSLE não conectado agora:** uma futura ponte apenas propõe ações, nunca governa o produto.

## 2. Elementos reutilizáveis e lacunas verificadas

Base atual no repositório:
- `docs/srs-spec.md`: SRS com estados e mapeamento operacional «again/hard/good/easy»; **agendamento não é domínio**.
- `docs/shadowing-spec.md`: feedback **local** de duração/pausas, sem análise de fonemas, inteligibilidade ou pronúncia.
- `docs/offline-sync-spec.md`: fila por usuário e dívidas históricas/operacionais documentadas, a verificar por QA de integração.
- `server/_core/llm.ts`: adaptador atual ainda usa `MANUS_API_URL`/`MANUS_API_KEY`; não representa fornecedor neutro em produção.
- `client/src/lib/csle-contract.ts`: `mockEngine` é simulação; não conectar ou promover como funcionalidade real.

Nenhuma dessas peças representa tutor proativo funcional já pronto. Antes de incorporar, Fase A verifica estado do banco, endpoints, testes e isolamento por usuário.

## 3. Modelo conceitual de execução

**Sequência dentro de cada turno:**

1. Cliente autentica e solicita `TutorSession`; Lingua lê preferências, consentimentos ativos, currículo vigente e observações oficiais autorizadas.
2. `InterventionPolicy` (código determinístico, não prompt) avalia se existe oportunidade de intervenção e seus limites.
3. `ContextBuilder` compõe somente o mínimo de contexto necessário, filtrando segredos, dados de terceiros e itens sem consentimento.
4. `LLMProviderAdapter` produz **mensagem + propostas tipadas**, nunca comando irrestrito de banco.
5. `ProposalValidator` valida esquema, currículo/pre-requisitos, acesso, quota, conteúdo, consentimento, evidência e idempotência.
6. Estudante aceita, recusa ou ajusta propostas que exigem sua decisão. Apenas serviços do Lingua executam ações autorizadas.
7. `TutorEvent` registra origem, razões, aceite/recusa, versão de política/modelo e custos; observações de aprendizagem separadas de memória conversacional.
8. Falha de fornecedor aciona mensagem transparente e percurso local: leitura, SRS, shadowing ou atividade textual não dependente do LLM.

**Invariante:** texto do LLM não constitui uma autorização. Nem ferramenta, prompt, conteúdo remoto ou «instrução» trazida por usuário pode sobrepor `InterventionPolicy` ou autorização de conta.

## 4. Contratos candidatos (não são código implementado)

`TutorSession`: `id, userId, targetLanguage, nativeLanguage, interfaceLocale, curriculumVersion, planVersion, mode(text|voice), startedAt, endedAt, state, consentSnapshotId`.

`TutorPreferences`: `tutorName, personaPreset, tone, correctionFrequency, initiativeLevel(off|low|normal), voiceEnabled, voiceId, playbackSpeed, captionsEnabled, accessibilityOptions, updatedAt`.

`TutorEvent`: `id, sessionId, userId, type, trigger, policyVersion, providerVersion, inputEvidenceRefs, redactedPayload, tokenOrAudioUsage, estimatedCost, decision, createdAt`.

`LearnerActionProposal`: `proposalId, source(tutor|curriculum|srs|csle-future), type(practice|explain|read|listen|review|explore|return|pause|add_srs_candidate), targetCompetencyIds, rationale, prerequisites, assistancePolicy, expiry, requiresStudentConfirmation, idempotencyKey`.

`ConversationMemory`: `id, userId, kind(explicit_preference|pedagogical_fact), value, sourceEventId, provenance, createdAt, expiresAt?, userVisible, userEditable, deletedAt?`.

`LearningObservationCandidate`: `competencyId, activityId, rubricVersion, attemptId, mode, responseRef, accuracyOrOutcome, assistance, context, confidence, provenance, consentSnapshotId`. **Candidato**, nunca registro de domínio por si.

As assinaturas e tabelas devem ser compatibilizadas com o esquema MySQL/Drizzle existente **somente depois do parecer técnico e aprovação**. Definir API contratual antes de migrations.

## 5. Política de proatividade

O tutor pode agir de forma proativa **somente em sessão ativa autenticada**, se `initiativeLevel != off`, com consentimento/contexto permitido, sem atividade sensível em andamento e sem intervenção suprimida.

**Gatilhos candidatos, em ordem de prioridade:**
- início de sessão: retomar competência pendente ou apresentar plano real, sem inventar «ontem você errou»;
- revisão SRS vencida: oferecer revisão contextual, se houver itens reais e elegíveis;
- sinal pedagógico observado: erro recorrente validado por rubrica, não interpretação vaga de uma fala;
- oportunidade de aplicar o que acabou de aprender: tarefa curta em outro contexto;
- estudante bloqueado/ocioso **dentro de atividade ativa**: oferecer ajuda contextual e opção de ignorar, sem vigilância invasiva.

**Limites iniciais propostos (configuráveis por política versionada):**
- no máximo 1 abertura espontânea por entrada de sessão;
- no máximo 1 sugestão não solicitada a cada 10 minutos de atividade efetiva;
- não repetir proposta recusada na mesma sessão;
- recusa «agora não» suprime aquele tópico até próxima sessão ou solicitação;
- modo `off` bloqueia todas as intervenções iniciadas pelo tutor, mantendo resposta quando chamado;
- nenhuma notificação push, coleta de microfone ou sessão fora do app sem consentimento específico posterior;
- proatividade não aumenta artificialmente para melhorar métricas de engajamento.

Esses valores são **hipóteses de UX**, sujeitos a testes e preferência explícita; nunca substituem opt-out.

**Exemplo correto:** «Na última atividade você precisou de ajuda para formar perguntas no passado. Quer treinar em uma conversa de viagem ou prefere uma explicação?». Permitido apenas se houver observação real, datada e acessível.

**Exemplo proibido:** «O CSLE detectou seu cérebro cansado», «você já dominou B2» ou «estou triste porque você não voltou».

## 6. Memória: o que entra, o que não entra

**Persistir só com finalidade clara e consentimento correspondente:**
- nome e estilo do tutor escolhidos diretamente pelo aluno;
- interesses declarados quando usados para personalizar tarefas;
- idioma, preferências de acessibilidade e estado de plano oficial;
- fatos pedagógicos validados e com referências de origem, minimizados.

**Não persistir como memória pessoal:** conversas integrais por padrão, áudio bruto, suposições sobre renda, saúde, personalidade, emoções, crenças, relações e terceiros; não fazer «perfil psicológico» escondido. Transcrições temporárias para sessão devem ter política explícita de retenção, expiração e exclusão.

**Controles:** «O que meu tutor lembra?», editar, apagar item, desativar memória opcional, limpar histórico; dados obrigatórios de conta e registros oficiais tratados separadamente com transparência jurídica. Revogação bloqueia novos usos, cancela pedidos pendentes e aplica política de exclusão pertinente. Exportação por usuário, nunca memórias de outra conta.

**Composição de contexto:** resumo condensado e versionado com fonte identificada, validade temporal, consentimento e importância pedagógica; injeção de prompt deve ser tratada como dado não confiável.

## 7. Prompting em camadas e segurança

O pipeline deve enviar:
1. **Instruções centrais controladas pelo servidor:** finalidade educacional, limites, transparência, cultura e idade/segurança.
2. **Política pedagógica Lingua:** competências, tarefas elegíveis, rubricas, feedback e limites de assistência, todos versionados.
3. **Preferências autorizadas:** nome do tutor, tom, idiomas, velocidade, interesses explícitos.
4. **Contexto observável:** últimas respostas e observações oficiais mínimas, com proveniência e indicação de incerteza.
5. **Pedido atual e conteúdo externo não confiável:** delimitado e sem autoridade.

**Regras centrais de comportamento:**
- linguagem natural, sem infantilização; não corrigir tudo de uma vez;
- pedir tentativa do aluno antes de fornecer solução integral quando apropriado;
- fazer perguntas de compreensão real e variar contextos;
- conversar na língua de apoio para explicação quando necessário; usar idioma alvo de forma gradual e compreensível;
- distinguir «posso estar errado», «ainda não avaliado» e «competência demonstrada»;
- nunca alegar interação com CSLE real quando há somente mock;
- não afirmar «sua pronúncia é excelente» com base em duração/pausas;
- dar feedback por rubrica e adaptar quantidade de correção à preferência, mantendo erros críticos visíveis;
- usar citações de conteúdo licenciado em conformidade, jamais mandar conteúdo protegido na íntegra ao modelo sem autorização.

**Formato de saída desejado:** `message`, `languageOfMessage`, `intent`, `pedagogicalGoal`, `proposals[]`, `uncertainty`, `sourcesOrEvidenceRefs[]`, `requiredStudentAction`, `safetyFlags[]`. Fornecedores sem saída estruturada exigem validador/parser estrito e recusa segura.

**Threat model mínimo:** prompt injection em textos de leitura; tool-call fictícia; falsificação de resultados; vazamento entre usuários; conteúdo ofensivo; alucinação de progresso; execução repetida/offline; custos altos; acessos não autenticados. Testes adversariais obrigatórios.

## 8. Integração de tutor, leitura e SRS

Um item novo percebido na conversa **não entra automaticamente no baralho oficial**. O tutor produz `add_srs_candidate` com forma, significado, idioma, contexto, origem, versão e deduplicação; a política de consentimento e configuração decide se é apresentada ao aluno para confirmar ou se existe uma regra explícita de inclusão automática reversível. Até aprovação dessa regra, **exigir confirmação**.

A revisão preserva `docs/srs-spec.md` (incluindo idempotência, restrições por usuário e state machine); o LLM não inventa `quality` e não emite `reviewLog` diretamente. Uma interação conversacional é diferente de uma revisão SRS explícita.

Shadowing local permanece disponível independentemente de LLM/voz remota, com métricas honestas. A camada de fonemas/pronúncia exige avaliação específica e validação com múltiplos sotaques antes de apresentar pontuação.

## 9. Voz — arquitetura de dois trilhos

**Trilho econômico (padrão para validação):** entrada de áudio *opt-in* → ASR (serviço configurável) → texto/transcrição revisável → LLM textual → TTS opcional (serviço configurável) → legenda e playback. Benefícios: auditabilidade, orçamento por componente, fallback texto e redução de custos por uso. Desvantagens: latência entre turnos, expressividade e interrupções mais limitadas.

**Trilho de experiência premium (adiado por custo, não autorizado nesta fase):** voz bidirecional em streaming com WebRTC, detecção de turno, interrupção da resposta e opção de delegar decisões pedagógicas ao backend Lingua. O modelo vocal não escreve em banco nem aprova evidência. Cobrança por tempo/tokens e risco de custo devem ser monitorados. Usar streaming apenas com permissão e indicador visível de captação; sem gravação em segundo plano.

**Candidatos atuais (snapshot de pesquisa, 21/11/2026):**
- OpenAI **GPT-Live-1.1**: full-duplex e conversação multilíngue; lista pública de **US$ 0,05/min ativo e US$ 0,02/min em standby** (backend e ferramentas cobrados à parte). Potencial para efeito «Jarvis», com orçamento rígido. [Modelo oficial](https://developers.openai.com/api/docs/models/gpt-live-1.1) | [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc).
- OpenAI **gpt-realtime-2.1-mini**: opção Realtime baseada em tokens de áudio; preço oficial atual **US$ 10/1 milhão de tokens de áudio de entrada e US$ 20/1 milhão de saída** (mais texto conforme tabela). Não transformar isso em «custo por minuto» sem medir uso real. [Tabela de preços](https://developers.openai.com/api/docs/pricing).
- OpenAI **gpt-transcribe / gpt-live-transcribe**: avaliar para ASR de alta qualidade, preços por workflow e idioma. [Transcrição](https://developers.openai.com/api/docs/guides/transcription) | [preços](https://developers.openai.com/api/docs/pricing).
- **Google Cloud Speech-to-Text e Text-to-Speech**: alternativas independentes a benchmarkar por latência, sotaque PT-BR/EN, qualidade e custo; contas/armazenamento podem ter custos adicionais. [ASR](https://cloud.google.com/speech-to-text/pricing) | [TTS](https://cloud.google.com/text-to-speech/pricing).
- **AWS Polly**: candidato a TTS convencional em trilho econômico; requer comparação auditiva e de preço por voz. [Documentação](https://docs.aws.amazon.com/polly/latest/dg/).
- **Open source local/autogerenciado:** STT/TTS e LLM com custo de inferência, servidor, suporte e qualidade. Só adotar após benchmark e dimensionamento; **não é «grátis»**.

**Atenção a descontinuações oficiais:** `tts-1`, `tts-1-hd`, `gpt-4o-mini-tts` encerram em **06/01/2027**; `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` e outros fluxos antigos de transcrição encerram em **26/02/2027**. Não escolhê-los como base nova. [Aviso TTS](https://developers.openai.com/api/docs/guides/text-to-speech) | [Aviso ASR](https://developers.openai.com/api/docs/guides/transcription).

**Decisão de voz para o MVP após parecer do Deep:** priorizar **push-to-talk** (pressionar, falar, soltar) com ASR → LLM → TTS desacoplados, condicionado à avaliação real de preço, qualidade e orçamento. **GPT-Live-1.1 NÃO está aprovado para implementação ou contratação nesta fase**; somente reavaliar streaming completo após validação comercial e econômica. Comparar 95º percentil de latência, percepção, precisão de transcrição, transferência pedagógica, gasto total e fallback. A afirmação «100 vezes mais barato» não está validada. Nunca embutir API key permanente no cliente; credenciais/token efêmero via servidor e quotas.

## 10. Orçamento, métricas e fallbacks

Instrumentar por usuário/sessão/provedor: uso de tokens, minutos ativos, custo estimado, latência do primeiro texto/áudio, latência entre turnos, taxa de correção da transcrição, cancelamentos, erros, propostas recusadas e eventos de privacidade (sem texto sensível por padrão).

**Exemplo de custo direto do serviço Live:** 30 min * 0,05 = **US$ 1,50** em tempo ativo, **antes** de backend, armazenamento, ferramentas e infraestrutura. Exemplo matemático ilustrativo, não custo final por aluno.

Definir budget cap diário/mensal, limitação de simultaneidade, timeout, circuit breaker, aviso quando troca para texto e backoff. Evitar truncar aluno no meio de tarefa de avaliação; preservar sessão segura e retomar por alternativa local.

Testar voz com consentimento recusado, microfone ausente, latência, falha de rede, sotaques variados, alternância PT/EN, acessibilidade, cancelamento imediato e tentativa de captura fora da sessão.

## 11. Critérios de aceite para a implementação futura

1. Aluno escolhe nome e muda nome/persona/voz sem perder progresso.
2. Tutor inicia conversa relacionada a evento **real** em sessão ativa; modo `off` impede iniciativa, mas não impede ser chamado.
3. Recusa é respeitada e auditável, sem repetição intrusiva.
4. Nenhum LLM altera currículo, notas, evidências, consentimento, SRS ou dados de conta sem serviço autorizado e validação.
5. Memória é isolada por proprietário, editável e excluível; não grava áudio por padrão.
6. Lição gera observação com fonte, assistência e confiança; nenhuma fala do tutor certifica domínio.
7. SRS, leitura e shadowing continuam úteis sem tutor/Internet conforme contratos existentes.
8. Texto e voz operam com `nativeLanguage` e `targetLanguage` separados, interface em `interfaceLocale`.
9. Chaves não vazam no app; limites de custo, métricas, controle de falhas e testes de injeção funcionam.
10. Não existe alegação pública de «CSLE ativo» até integração auditada.

## 12. Registro de decisão posterior (21/11/2026)

O parecer do Deep **autoriza uma implementação restrita do onboarding Fase B** na branch separada `feat/onboarding-jarvis`, sem ativação de produção; não autoriza ainda voz ativa, memória persistente ampla, tutor proativo completo ou ligação CSLE. O novo código requer auditoria do PR, CI, QA com MySQL staging e aprovação para qualquer migration ou deploy. O escopo autorizado é descrito em [Fase B](./ONBOARDING-PHASE-B-IMPLEMENTATION.md).

**Relacionados:** [Visão do produto](./PRODUCT-VISION.md), [Onboarding](./ONBOARDING-SPEC.md), [SRS](./srs-spec.md), [Shadowing](./shadowing-spec.md), [Offline](./offline-sync-spec.md).
