# Adaptador Catálogo → CAL → Naruto — Contrato de integração (proposta v0.1)

**Data:** 24/11/2026 UTC · **Fase:** 01 — Naruto · **Estado:** especificação PARA AUDITORIA; sem implementação runtime, merge, migrations ou deploy.  
**Referências:** [Constituição](./CONSTITUICAO-PEDAGOGICA-v0.1.md), [Orquestrador Naruto](./ORQUESTRADOR-PEDAGOGICO-NARUTO.md), [Roadmap](./ROADMAP-ESTRATEGICO-LINGUA.md), [PR #39](https://github.com/looksai/Lingua/pull/39) (máquina CAL pura, mergeada), [PR #40](https://github.com/looksai/Lingua/pull/40) (piloto de integração com flag, não mergeado) e [PR #41](https://github.com/looksai/Lingua/pull/41) (catálogo de 8 competências e 24 tarefas, não mergeado).  
**Crítica central:** não transformar uma coleção de palavras e frases em uma trilha compulsória. A intenção/curiosidade do aluno governa a escolha de objetivo, e o Lingua mantém autoridade curricular e avaliativa.

## 1. Propósito

O futuro adaptador substitui a microtarefa fixa “Hello = Olá” do piloto #40 por tarefas versionadas da PR #41, sem modificar a responsabilidade de cada camada:

- **Catálogo Lingua:** o que ensinar, IDs estáveis de microcompetência, pré-requisitos, textos e rubricas versionados. Não armazena nenhum estado pessoal.
- **Política CAL:** qual a próxima ação pedagógica permitida; quando observar/ensinar/praticar/retomar/transferir/comprovar; guards e tentativas.
- **Naruto:** formula linguagem natural, contextualiza e responde a perguntas; não seleciona livremente a rubrica nem declara domínio.
- **Validador:** confere identidade autenticada, sessão/versão, entrega efetiva de tarefa, modalidade, assistência, contexto e possibilidade de avaliar.
- **Memória e SRS:** permanecem em contratos próprios, com consentimento e governança Lingua; **não** são efeitos colaterais do adaptador.
- **CSLE:** não é instanciado nesta Fase 01. Interface de sugestões futura só após desenvolvimento isolado e autorização de acoplamento na Fase 03.

O adaptador funciona como **motor de decisão local e puro na primeira etapa**, sem exigir segunda chamada de LLM por mensagem.

## 2. Fluxo futuro: desenho sem efeito em dados

\`\`\`text
Mensagem do aluno + consentimento + conta autenticada
    ↓
Intenção do aluno: objetivo explícito / dúvida / resposta / pausa / desconhecido
    ↓
Seleção de objetivo: somente IDs aprovados do catálogo + pré-requisitos autorizados
    ↓
Snapshot CAL da sessão (efêmero no piloto)
    ↓
Política determinística + escolha de tarefa versionada
    ↓
TurnPlan {competencyId, taskId, rubricVersion, phase, strategy}
    ↓
Naruto produz texto de explicação (ou template original/validado)
    ↓
Validador do SERVIDOR confirma se a pergunta foi realmente entregue
    ↓
Cliente visualiza texto; resposta posterior vinculada a taskId entregue
    ↓
Avaliação limitada: closed rule candidate / requires_review / not_evaluable
    ↓
stepCAL recebe evento SOMENTE se houver evidência legítima e contexto confiável
    ↓
Resposta respeitosa + próxima ação; sem gravar patrimônio/SRS/DB
\`\`\`

**Proibição:** classificar como incorreta uma mensagem livre do aluno só porque tem poucas palavras, surgiu durante um exercício ou não correspondeu ao gabarito. Perguntas, correções, pedidos, silêncio, desconhecimento, interrupção e contexto novo **não são tentativas classificáveis** por padrão.

## 3. Contratos candidatos (tipos ainda não implementados)

\`\`\`ts
type TaskDelivery = Readonly<{
  sessionId: string; stateVersion: number; ownerUserId: number;
  objectiveId: string; competencyId: string;
  taskId: string; taskVersion: number; rubricVersion: string;
  askedAtMs: number; modality: "typed" | "audio";
  supportShown: "none" | "hint" | "translation" | "model";
  // Enviado pelo servidor SOMENTE após confirmação de apresentação no
  // texto/renderização entregue, não por alegação da LLM.
  delivered: true;
}>;

type LearnerInputClassification =
  | {kind: "explicit_answer"; taskId: string; text: string}
  | {kind: "question"; text: string}
  | {kind: "change_objective"; proposedObjectiveId: string}
  | {kind: "help" | "pause" | "resume" | "decline" | "unclear"};

type CheckedCandidate =
  | {status: "closed_match_candidate"; outcome: "meets" | "not_yet";
     taskId: string; attemptedAtMs: number; assistance: TaskDelivery["supportShown"]}
  | {status: "not_evaluable"; reasonCode: string}
  | {status: "open_requires_review"; taskId: string};
\`\`\`

**Proteções:** nunca confiar em \`ownerUserId\`, \`taskId\`, \`delivered\` ou classificação enviada pelo navegador/LLM. O servidor deve validar contra sessão autenticada e tarefa emitida por ele. \`rule_candidate\` **não** é evidência oficial; no piloto pode servir somente de **sinal local do CAL** quando a regra é aplicável e a entrega foi atestada.

## 4. Como selecionar o que ensinar

**Objetivo informado pelo aluno é principal:** “quero entrevista de soldador no Canadá” deve orientar o foco, não obrigar “Hello” a cada início. Para iniciante absoluto, o sistema pode apresentar um *chunk* de apoio em PT-BR e explicar por que a tarefa foi escolhida, permitindo escolha alternativa.

A correspondência de intenção com catálogo deve ser **conservadora**: termos explícitos, objetivos já selecionados no próprio fluxo e escolhas do aluno; inferência da LLM é somente uma proposta. “Quero aprender inglês” sem objetivo específico deve permitir **pergunta curta de escolha** (greetings, profissão, viagem), sem atribuir nível/CEFR.

**Pré-requisitos:** \`eligibleMicrocompetencies\` recebe apenas um conjunto de competências/pré-requisitos **atestados pela política do Lingua**; o frontend não envia \`prerequisitesSatisfied\` como dado confiável. No laboratório, usar perfis sintéticos rotulados; nunca transformar interesse ou memória pessoal em conjunto de competências dominadas.

**Pessoas fictícias:** “Alex” e “soldador” nos exemplos do catálogo **não** viram nome/profissão do aluno. Personalização só por texto recente do próprio aluno ou memória previamente aprovada.

## 5. Contrato de apresentação e avaliação

**Perguntas fechadas:**
- Entregar a pergunta efetivamente, com **ID/versão da tarefa**; identificar apoio mostrado ao aluno.
- Aceitar gabaritos legítimos de escrita digitada; reconhecer equivalência somente quando **catalogada e testada**. Parafraseamento livre pede revisão, não erro automático.
- Resposta breve e distinta que pertença a outro gabarito de mesmo tipo pode ser **distrator conhecido**, mas ainda é **candidato**, nunca punição/globalização de desempenho.
- Respostas com \`?\` são ambíguas: podem ser pedido de ajuda **ou** a tradução de uma pergunta. Resolver conforme \`TaskMode\`, gabarito aprovado e intenção explícita; se indeterminado, \`not_evaluable\`. Não remover pontuação antes de verificar se a pessoa está perguntando.
- Uma string desconhecida ou frase pessoal não é prova de erro. Não julgar fonemas via transcrição ASR.
- Se Naruto apenas **cita** uma pergunta como exemplo, sem entregá-la como tarefa, não esperar resposta nem registrar tentativa.

**Transferência aberta:** tarefas \`open_transfer\` **não** recebem nota por igualdade de texto. Exigem rubrica e revisão adequada; contexto novo não se reduz à troca de nomes. Registros futuros precisam de proveniência, data e assistência.

**Comprovação:** três acertos, elogios do Naruto ou revisão SRS não marcam \`MASTERED\`, CEFR, certificado ou competência permanente. Uma resposta correta imediata é desempenho pontual, frequentemente assistido. Retenção exige oportunidade posterior verificada; a etapa CAL \`COMPROVAR\` pode documentar **evidências insuficientes**.

## 6. Estado e interrupções

**Durante o laboratório:** snapshots CAL são **efêmeros e sem PII**, localizados por sessão fictícia, com ID e versão. O cenário #40 em \`Map\` por \`userId\` é apenas um piloto: expira após 30 min/restart, não sincroniza múltiplos nós e não é patrimônio.

**Em uso real futuro:** serializar eventos pelo usuário/sessão com \`expectedVersion\` e idempotência durável; evitar dois dispositivos gravarem duplicatas. Definir política de exclusão/retenção antes de migration, não aqui.

**Pergunta fora de tarefa:** suspende classificação e preserva estado, permitindo retomar sem forçar o exercício. Mudança explícita de objetivo reabre \`OBSERVAR\` para o novo foco; não levar contadores de erro de uma competência para outra.

**Pausa:** sem mensagem espontânea por timer nesta versão. O fundador havia recebido proposta de “2 minutos sem resposta → mensagem”; isso não está aprovado como comportamento automático, requer UX e consentimento específicos.

## 7. Segurança e custo

- Flag \`CAL_ENABLED\` permanece **false por padrão** até homologação autorizada; nenhuma exigência de mudança no Render agora.
- Sem chamadas de agentes adicionais para orquestração; usar tarefas de catálogo e regras locais. Se futura rubrica aberta exigir LLM, justificar custo adicional e calibrar contra humano.
- Sempre usar histórico/memória somente com permissões existentes. Não atribuir currículo por profissão inferida.
- Não salvar transcrições/áudios/respostas cruas para fins pedagógicos sem política e aprovação.
- Falha de regra/catálogo/provedor deve ser **fail safe para integridade e transparente para o aluno**. Fallback preserva turno, não registra competência.
- Não conceder ao CSLE nem a prompts externos permissão de executar decisões sobre currículo, consentimento ou certificar.

## 8. Bateria de aceite proposta para futura PR de adaptador puro

| Caso | Estímulo | Esperado |
|---|---|---|
| ADP-01 | Objetivo explícito “me apresentar” | Selecionar competência pertinente; não impor Hello automaticamente |
| ADP-02 | “Quero estudar para entrevista” no meio de Hello | Mudar/suspender foco sem erro |
| ADP-03 | Aluno sem inglês, sem objetivo | Sondagem curta em PT-BR e escolha voluntária |
| ADP-04 | Nome Alex no modelo | Não inferir que aluno se chama Alex |
| ADP-05 | “Sou soldador” em turno atual | Pode contextualizar só aquele turno; não fingir memória salva |
| ADP-06 | Outra conta usa mesmo taskId | Sessão/observações não cruzam usuários |
| ADP-07 | Pergunta exibida apenas como exemplo | Não marcar tarefa como entregue |
| ADP-08 | Resposta com pista/modelo exibido | No máximo desempenho assistido |
| ADP-09 | Frase desconhecida vs gabarito | \`not_evaluable\`, não erro inventado |
| ADP-10 | Resposta lexical distratora conhecida | Candidato a erro daquela tarefa somente |
| ADP-11 | “Com o que você trabalha?” com \`?\` | Distinguir pergunta de resposta à tradução; se incerto, não avaliar |
| ADP-12 | ASR transcreveu palavra | Não diagnosticar pronúncia |
| ADP-13 | Tarefa aberta de transferência | Requer revisão; nada de gabarito automático |
| ADP-14 | 3 acertos/cópias | Sem certificação/CEFR |
| ADP-15 | 3 erros verificáveis | Sugerir outra estratégia, não repetir eternamente |
| ADP-16 | Falha LLM/timeout | Não registrar tentativa ou entrega que não ocorreu |
| ADP-17 | Flag desligada | Tutor comporta-se como versão anterior |
| ADP-18 | CSLE indisponível ou desativado | CAL independente segue; nenhuma simulação passa por motor real |
| ADP-19 | Pedido de memória/SRS | Só candidatos e interfaces oficiais com consentimento |
| ADP-20 | Versão de tarefa antiga | Reconciliar ou rejeitar sem misturar rubricas |

**Condição de conclusão:** TS/testes/build verdes para a **PR futura do adaptador puro**, auditoria Deep e autorização do fundador. **Testes sintéticos não demonstram eficácia pedagógica humana.**

## 9. Questões que dependem de parecer/decisão

1. A ligação do catálogo deve ser **somente explícita** (aluno escolhe objetivo) na primeira etapa ou incluir seleção sugerida por regra com confirmação?
2. Como preservar conveniência quando Naruto parafraseia as perguntas? Recomenda-se **UI/servidor emitir tarefa versionada** em vez de inferir entrega apenas pelo texto livre gerado pelo LLM.
3. Quando uma pergunta interrogativa é a **resposta correta** a uma tarefa de tradução, como distingui-la de um pedido de explicação? Exigir contexto/ID de tarefa validado.
4. Que dados podem existir apenas em sessão e por quanto tempo? Persistência futura exige política de retenção, consentimento e migration separada.
5. Quais métricas/padrões demonstrarão ganho sobre o Naruto sem orquestrador (aprendizagem, frustração, latência, custo, regressão)?

**Decisão solicitada:** revisar esta especificação e priorizar os próximos incrementos; ela **não** autoriza merge das PRs #40/#41 nem conexão ao Render.
