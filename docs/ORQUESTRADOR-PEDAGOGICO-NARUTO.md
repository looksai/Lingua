# Orquestrador Pedagógico Naruto — Especificação Técnica (Fase 01)

**Versão:** proposta v0.1 · **Data:** 23/11/2026 · **Status:** PARA AUDITORIA DE DEEP E APROVAÇÃO DO FUNDADOR — **NÃO IMPLEMENTAR**  
**Escopo:** design do motor decisório pedagógico do Naruto dentro do **Lingua**, independente do CSLE real.  
**Normas superiores:** [Constituição Pedagógica v0.1](./CONSTITUICAO-PEDAGOGICA-v0.1.md), [Roadmap Estratégico](./ROADMAP-ESTRATEGICO-LINGUA.md), [Especificação do Tutor](./TUTOR-SPEC.md), [SRS](./srs-spec.md), [Issue #38](https://github.com/looksai/Lingua/issues/38).  
**Autoridade:** o fundador decide alterações; Deep audita; **Lingua** governa currículo, consentimento, registros oficiais e avaliação; a LLM **propõe/explica/ensina**, não certifica nem executa comandos de persistência por conta própria.

> **Esta entrega é SOMENTE DOCUMENTAÇÃO.** Não cria tabelas, endpoints, estados persistidos, políticas runtime, configurações, migrations, deploys, alteração de SRS ou integração CSLE. Os tipos, nomes de componentes e exemplos SQL abaixo são **candidatos a contrato**, não infraestrutura existente. O Stripe (#32) continua pausado.

## 0. Situação atual (verificada em `main`)

| Componente | Presente hoje | O que falta |
|---|---|---|
| `server/tutor-router.ts` | Chat tRPC autenticado, autorização para IA, orçamento, adaptação de idioma, guarda de fatos, proposta de memória e resposta/fallback | **Estado CAL explícito**, objetivos por competência, classificação verificável da tentativa, transições auditadas |
| `shared/tutor.ts` | Instruções gerais e perfil/interesses; limite de texto de 1.200 caracteres e histórico limitado a 8 mensagens | Plano tipado do turno, rubrica, objetivo de cada intervenção e resultado estruturado confiável |
| `server/tutor-free-provider.ts` e `server/tutor-provider-selector.ts` | Provedores selecionáveis, proposta de memória e transcrição | Adaptador para **propostas pedagógicas tipadas**, validáveis, sem autoridade de decisão |
| `shared/tutor-language.ts` | Heurística de iniciante absoluto e barreira para resposta excessivamente em inglês | Garantir didática sem perder intenção/pergunta real quando o fallback heurístico substitui a resposta |
| `server/tutor-fact-guard.ts` | Bloqueia alguns padrões de credenciais e anos de experiência inventados | Cobertura adversarial ampliada e proveniência de todos os fatos relevantes |
| `server/learner-memory.ts` / `learnerMemories` | Guarda **fatos literais autorizados**, carregados por `userId`; listagem/exclusão | Garantir que fatos pessoais não sejam confundidos com desempenho nem enviados sem consentimento |
| `docs/srs-spec.md` + módulos existentes | Estados operacionais `new/learning/review/relearning`, avaliações `again/hard/good/easy`; SRS agenda revisões | Uma **ponte controlada por política** para *candidatos* vindos do tutor; não existe autorização de inserção automática |
| `server/tutor-budget.ts` | Limites de teste por processo/usuário | Custos e latência por estratégia/atividade; futura persistência somente com autorização |
| `client/src/lib/csle-contract.ts` | Contrato/mock histórico | **Não é acoplamento real**; desenvolvimento CSLE é Fase 02, integração formal só na Fase 03 |

**Problema central:** o prompt atual pede um comportamento pedagógico desejado, mas não existe uma política operacional independente que decida, registre e valide **o objetivo do turno, estado CAL, tentativa, assistência, mudança de estratégia e critérios de avaliação**.

---

# 1. Arquitetura proposta e limites de autoridade

## 1.1 Princípio da divisão de responsabilidades

```text
Aluno (texto/voz opcional) → tRPC autenticado / consentimento
                                ↓
                    TutorOrchestrator (Lingua)
       ┌────────────────┬──────────────────┬────────────────┐
       │ ContextBuilder │ PedagogicalPolicy│ Task/RubricCatalog
       └────────────────┴──────────────────┴────────────────┘
                                ↓
                       TurnPlan tipado
                                ↓
                 Naruto LLM (explica/gera proposta)
                                ↓
             Validator + EvidenceEvaluator (Lingua)
                                ↓
                    resposta + próxima decisão
                       │              │
       memória aprovada/opt-in      candidatos pedagógicos
             (separada)             (não oficiais)
                                       ↓
                              portão de autorização
                                       ↓
                             Lingua / SRS (futuro)
```

O **TutorOrchestrator** é um serviço do Lingua, e **não uma nova LLM obrigatória**. A política de autorização, invariantes e transições deve ser determinística; formulação de explicações, exemplos e alternativas pode aproveitar a chamada **já existente** da LLM. Validações complexas podem pedir revisão humana ou uma estratégia de baixo risco, **sem pressupor chamadas extras por turno**.

**Componentes candidatos:**

1. `SessionStateRepository`: lê/grava versão do estado do aluno/sessão somente após consentimento, retenção e migration aprovados. Na primeira prova de conceito, simular em memória com dados sintéticos.
2. `ContextBuilder`: combina currículo/objetivo verdadeiro, observações permitidas, memórias autorizadas e histórico mínimo; inclui proveniência e expiração.
3. `PedagogicalPolicy`: aplica ordem de prioridade, pré-condições e matriz de transição; **não interpreta saída da LLM como comando**.
4. `StrategySelector`: seleciona uma estratégia do repertório versionado com restrições de custo, modalidade, capacidade, acessibilidade e evidência.
5. `TaskCatalog` + `RubricRegistry`: tarefas identificadas, competência-alvo, pré-requisitos, dificuldade, critérios, respostas referenciais quando apropriadas e modos de assistência.
6. `ProviderAdapter`: emite instrução didática ou proposta tipada em uma chamada de IA quando necessária; nunca grava currículo, memória, SRS ou evidência oficial.
7. `ProposalValidator` + `EvidenceEvaluator`: conferem esquema, segurança, resposta do aluno e qualidade do sinal de avaliação; resultados complexos podem ser classificados como **não avaliáveis**.
8. `TutorEventRecorder`: trilha sanitizada de decisões, versões, hashes/IDs e metadados autorizados; **não** grava conversas integrais nem áudio bruto por padrão.
9. `LearnerMemoryGateway` e `SrsCandidateGateway`: acesso por interfaces estreitas, com permissão explícita para qualquer escrita.
10. `CSLEAdapter` **futuro**, desligado na Fase 01: na Fase 03 recebe apenas observações autorizadas e devolve propostas à política Lingua; não assume decisão final.

**Separação essencial:** memória biográfica (ex.: «Sou soldador MIG e TIG»), observação de aprendizado, revisão SRS e competência comprovada são objetos com finalidades e regras de gravação diferentes.

## 1.2 Unidade de execução

Um turno pedagógico contém **no máximo um objetivo principal** e pode incluir um exemplo curto, explicação e pergunta. Não confundir uma resposta conversacional comum («Quanto custa um curso?») com tentativa de avaliação: o sistema deve saber **quando NÃO está aplicando uma tarefa**.

A primeira versão deve suportar **modo aula**, **modo pergunta livre**, **modo prática** e **modo revisão sob autorização**. O aluno pode interromper, pedir explicação, trocar de assunto ou recusar uma atividade sem penalidade. O estado CAL é o foco da atividade, **não uma prisão de fluxo**.

---

# 2. Máquina de estados CAL

**Estados obrigatórios:** `OBSERVAR`, `ENSINAR`, `PRATICAR`, `RETOMAR`, `TRANSFERIR`, `COMPROVAR`.  
`PAUSADO`, `CANCELADO`, `ERRO_TECNICO`, `AGUARDANDO_ALUNO` são **condições de sessão**, não estados CAL adicionais. Uma sessão pode conter várias competências em momentos diferentes, mas apenas **um foco ativo por vez**.

## 2.1 Significado, saída e guarda de cada estado

| Estado | Objetivo | Intervenção esperada | Condição de saída |
|---|---|---|---|
| **OBSERVAR** | Levantar objetivo, barreira, repertório e dados observáveis sem rotular proficiência | pergunta curta/sondagem voluntária, escolha de objetivo ou observação de tarefa | objetivo elegível definido + pré-requisitos/contexto suficiente; se desconhecido, continuar sondagem curta ou oferecer ajuda |
| **ENSINAR** | Tornar compreensível um elemento novo ou corrigir uma lacuna | explicação em PT-BR quando necessária, exemplo inglês curto com tradução, áudio ou imagem *se disponível* | **sinal observável de compreensão** na microtarefa ou escolha do aluno por tentar; mero «entendi» é sinal fraco, não comprovação |
| **PRATICAR** | Produzir com pistas graduais, receber feedback e tentar novamente | completar lacuna, resposta guiada, roleplay curto, repetição/áudio opcional | tentativa classificada com rubrica e ajuda conhecida; quando houver desempenho suficiente, propor recuperação posterior ou transferência |
| **RETOMAR** | Recuperar informação previamente ensinada sem revelar a resposta primeiro | pergunta sem pista e revelação progressiva se necessária | tentativa datada e classificável; sem item elegível, regressar a ensino/prática, **não fabricar revisão vencida** |
| **TRANSFERIR** | Aplicar conhecimento em situação **nova** | diálogo/solicitação com mudança de interlocutor, tarefa ou contexto | desempenho em tarefa distinta, registrando assistência e diferenças em relação ao treino |
| **COMPROVAR** | Sintetizar evidências de competência específica sem certificar | miniavaliação com rubrica, desafio diferido, comparação de tentativas | relatório com evidência, incertezas e lacunas; próxima atividade via OBSERVAR/ENSINAR/RETOMAR conforme resultados |

## 2.2 Matriz normativa de transições (proposta inicial)

| De → para | Gatilho objetivo (guard) | Ação e registros mínimos |
|---|---|---|
| `OBSERVAR → ENSINAR` | objetivo e pré-requisito definidos; conhecimento não observado ou ajuda solicitada | selecionar microconteúdo; registrar tarefa e estratégia propostas |
| `OBSERVAR → PRATICAR` | aluno solicita tentativa de tema já conhecido e tarefa é elegível | tarefa com rubrica, sem afirmar nível |
| `ENSINAR → PRATICAR` | microcompreensão demonstrada (ex.: seleção de significado) **ou** escolha explícita de tentar | registrar tipo de evidência de compreensão; se só autodeclaração, marcar como **não verificada** |
| `ENSINAR → ENSINAR` | explicação não compreendida / aluno pede repetir | mudar modalidade, exemplo ou tamanho do passo; não repetir texto idêntico indefinidamente |
| `PRATICAR → PRATICAR` | tentativa incompleta, erro reparável, ajuda ainda útil | feedback específico, dica graduada, nova tentativa com limite de frustração |
| `PRATICAR → ENSINAR` | **três erros consecutivos** na mesma microcompetência *elegível* (**limiar de teste**, ajustável), pedido de ajuda ou padrão de incompreensão | mudar estratégia (não apenas repetir); zerar sequência de erros da tentativa atual, preservar observações sem rotular incapacidade |
| `PRATICAR → RETOMAR` | conteúdo foi previamente apresentado e existe oportunidade de recuperação sem pista, dentro de sessão ou em retorno posterior identificado | nunca mostrar resposta antes da tentativa; registrar intervalo real |
| `PRATICAR → TRANSFERIR` | desempenho formativo adequado e aluno preparado, sem exigir número rígido de acertos | tarefa nova, rubrica equivalente e assistência registrada |
| `RETOMAR → ENSINAR` | falha de recuperação ou indicação clara de lacuna | reapresentar conteúdo em outra abordagem; não «rebaixar nível» |
| `RETOMAR → TRANSFERIR` | recuperação suficientemente adequada com baixa ajuda | desafio novo e contextualizado |
| `TRANSFERIR → PRATICAR` | nova situação revelou erro específico tratável com prática | treino focalizado, sem atribuir fracasso global |
| `TRANSFERIR → COMPROVAR` | há observações independentes/elegíveis suficientes para fazer avaliação **limitada** da competência; caso contrário somente relatório de lacunas | agregar tentativas e incertezas; **sem carimbo automático de domínio** |
| `COMPROVAR → OBSERVAR` | lacuna ou objetivo concluído para esta sessão | escolher novo próximo objetivo ou oferecer pausa |
| `COMPROVAR → ENSINAR/RETOMAR` | evidência insuficiente, contraditória ou não retida | propor reforço ou nova observação; não esconder incerteza |
| **Qualquer estado → mesmo estado/OBSERVAR** | mudança de objetivo, recusa, limitação de tempo, pedido de explicação, falta de acessibilidade | honrar intenção do aluno, sem cobrança pedagógica ou perda de histórico autorizado |

**Observação crítica:** não existe uma linha temporal obrigatória que force todos os seis estados em cada conversa. `RETOMAR` e `COMPROVAR` frequentemente exigem **outro momento ou sessão**; não inventar um teste diferido em cinco minutos. A política deve evitar ciclos intermináveis e possibilitar encerramento digno.

## 2.3 Erros, loops e interrupções

- **Três erros seguidos** é **hipótese operacional**, não lei da aquisição de idioma. Só contar tentativas independentes do mesmo alvo, com enunciado compreensível e avaliação confiável. Erro de ASR, indisponibilidade, silêncio, recusa e resposta não avaliável **não** contam como erro do aluno.
- Ao atingir o limiar, propor **reensino diferente**: diminuir complexidade, trocar exemplo, apresentar contraste, acrescentar tradução/áudio, perguntar qual parte confundiu. Contador por objetivo, zerado após intervenção/troca de objetivo.
- Se após **duas estratégias distintas** persistir incompreensão ou frustração, oferecer pausa, explicação alternativa, objetivo menor ou revisão por humano. Não forçar vinte tentativas.
- Erro conceitual perigoso ou informação de segurança (por exemplo, procedimento técnico arriscado) requer **correção prioritária e cuidadosa**, sem fingir expertise operacional; erros leves de forma podem esperar até terminar o enunciado.
- `ASR_UNCERTAIN` bloqueia diagnóstico fonético, não declara pronúncia errada. O tutor pode comparar **texto transcrito** com a frase-alvo e explicar que o reconhecimento pode falhar.
- Falha de fornecedor: manter integridade do estado, comunicar a falha e usar alternativa local permitida; uma resposta de fallback **não conta** como sucesso pedagógico nem como evidência produzida pelo aluno.
- `timeout`, logout, revogação de consentimento, mudança de conta e duas abas simultâneas devem invalidar operações antigas pelo par `sessionId + version`; evitar gravação cruzada.

## 2.4 Exemplo de trajetória (iniciante absoluto)

Aluno: «Sou soldador MIG e TIG e não sei nada de inglês».  
`OBSERVAR`: identificar que deseja falar de profissão; **ser soldador é autodeclaração, não habilidade linguística**.  
`ENSINAR`: «**I am a welder** = Eu sou soldador. Quer ver o significado de *welder*?»  
`PRATICAR`: pedir identificação de significado e depois um pequeno enunciado. Se houver três tentativas erradas verificáveis, voltar a `ENSINAR` com **outro** exemplo.  
`RETOMAR`: mais tarde, sem exibir a frase: «Como diz “Sou soldador”?».  
`TRANSFERIR`: interlocutor pergunta «**What do you do?** (O que você faz?)».  
`COMPROVAR`: descrever exatamente a atividade observada, suporte e contexto, e marcar **necessidade de validação diferida** — não «inglês dominado», CEFR ou currículo concluído.

---

# 3. Repertório de estratégias e custo

**Unidade de custo:** estimativa de consumo de serviços, não preço comercial. `0 LLM` = determinístico/local; `1 LLM` = pode usar a chamada de texto **já prevista para o turno**; `+ ASR`, `+ TTS`, `+ imagem` = serviço/recursos opcionais adicionais. **Token/custo real deve ser medido por provedor e modelo**; não existe valor em US$ garantido nesta proposta.

| Estado | Técnica | Quando usar | Quando NÃO usar | Custo previsto |
|---|---|---|---|---|
| OBSERVAR | Pergunta de objetivo e conhecimento prévio | aluno novo, objetivo incerto, alteração de necessidade | transformar sondagem em diagnóstico formal/CEFR | 0 LLM se tarefa fixa; até 1 LLM para frase contextual |
| OBSERVAR | Microtarefa de compreensão | calibrar suporte sem pressupor proficiência | aluno recusou diagnóstico ou precisa de acolhimento primeiro | 0 LLM para item catalogado; 1 LLM se contextual |
| ENSINAR | Tradução direta + chunk | iniciante absoluto, confusão de sentido, urgência comunicativa | aluno explicitamente pede desafio sem tradução e compreende bem | 0 LLM catálogo; 1 LLM formulação |
| ENSINAR | Gramática contextual/contraste | erro recorrente em uma estrutura relevante | exposição longa e abstrata antes de compreender exemplo | 1 LLM; possibilidade de template 0 LLM |
| ENSINAR | Figura/licença + associação | conceito concreto e imagem já disponível/autorizada | imagem inventada, inadequada, custo não justificado, aluno sem acesso visual | 0 LLM com recurso existente; + rede/geração se aprovada |
| ENSINAR | Modelo de escuta em voz | leitura difícil ou aluno deseja ouvir ritmo | consentimento não concedido, serviço inacessível, voz pouco inteligível | + TTS, 0 se áudio licenciado/cache |
| PRATICAR | Cloze, reformulação e produção guiada | unidade já demonstrada, resposta verificável | conteúdo não foi ensinado, instrução ambígua | 0 LLM tarefa estática; até 1 LLM feedback |
| PRATICAR | Conversação curta/roleplay | preparar tarefa real e motivadora, ajuda graduada | aluno ainda não compreende enunciado; cenário intimidador | ~1 LLM por turno |
| PRATICAR | Repetição/shadowing | aluno opta por áudio, objetivo é ritmo/inteligibilidade | declarar erro de fonema via Whisper; microfone sem autorização | + TTS/áudio + ASR opcional |
| RETOMAR | Recuperação ativa antes de revelar | conteúdo realmente visto e devido/opportuno | conteúdo nunca ensinado, item de outro aluno, memória apagada | 0 LLM para item conhecido; até 1 LLM para diálogo |
| RETOMAR | Dica progressiva | falha de lembrança genuína | dar resposta antes da tentativa sem necessidade | 0 LLM catálogo; até 1 LLM |
| TRANSFERIR | Situação nova com rubrica | prática anterior adequada; testar generalização | apenas trocar nomes mantendo resposta idêntica; exigir capacidade não ensinada | ~1 LLM + avaliação quando aplicável |
| TRANSFERIR | Problema/cenário profissional | interesse explicitamente declarado e nível apropriado | inferir certificação, instrução técnica perigosa, uso de dados privados | ~1 LLM; recursos extras opcionais |
| COMPROVAR | Rubrica determinística para resposta restrita | item fechado ou resposta normalizável | avaliação aberta de fala/sotaque com ASR impreciso | 0 LLM |
| COMPROVAR | Rubrica textual assistida pela IA, **com validação** | resposta aberta que não admite correção simples | transformar julgamento subjetivo da IA em verdade oficial | até 1 LLM adicional **somente se aprovado**; preferir amostra humana |
| COMPROVAR | Retenção diferida + tarefa nova | existe evidência de ocasiões e contextos distintos | apresentar como «prova» em uma única sessão | 0 LLM agregação + custo das tarefas futuras |

### Política de orçamento proposta

- **Padrão pretendido:** uma chamada de texto por turno quando IA é necessária; prompts não devem disparar cadeias multiagente ocultas.
- Reaproveitar tarefas, rubricas e conteúdo licenciado versionados, evitando geração contínua da mesma atividade.
- Estimar por turno, sem prometer números universais:
  `custo_turno = tokens_entrada × tarifa_entrada + tokens_saida × tarifa_saida + segundos_ASR × tarifa_ASR + caracteres_TTS × tarifa_TTS + outros` (normalizar as unidades da tarifa de cada fornecedor).
- Instrumentar latência p50/p95, tokens entrada/saída, ASR/TTS, taxa de erros/fallback e **custo por tentativa pedagógica útil**; não otimizar apenas para menor custo se isso piorar o ensino.
- Os limites atuais em `server/tutor-budget.ts` são **por processo, não uma quota persistente**; manter restrição de acesso aos testadores no staging. Não reativar Stripe para custear o experimento.

---

# 4. Motor de decisão determinístico

## 4.1 Ordem de prioridade (de maior para menor)

1. **Segurança e direitos do aluno:** autenticação, titularidade de dados, consentimento, limites de ferramenta/fornecedor, recusa e acessibilidade; bloqueiam o turno quando não satisfeitos.
2. **Intenção atual e compreensão:** pergunta explícita do estudante, desejo de pausar/mudar de assunto, idioma de apoio, dificuldade declarada e sinais verificáveis de confusão.
3. **Correção crítica e factual:** evitar informações falsas ou perigosas; recusar conclusões não suportadas. Em fala, não confundir transcrição divergente com defeito articulatório.
4. **Objetivo curricular elegível e pré-requisitos:** Lingua define, Naruto não altera currículo oficial.
5. **Estado CAL + evidência da tentativa:** continuar, simplificar, trocar estratégia, retomar ou desafiar, respeitando os guards da seção 2.
6. **Fluência conversacional, motivação e preferências:** corrigir erro leve depois da fala, não interromper toda produção; humor e personalização não têm prioridade sobre entendimento.
7. **Eficiência operacional:** escolher opção mais barata **dentro** do conjunto pedagogicamente aceitável e segura; fallback sem fingir sucesso.

**Exemplo de conflito:** aluno pergunta de forma fluida «I am welded?». O tutor pode deixá-lo concluir, depois corrigir *I am a welder* de modo útil; se a fala for sobre risco imediato ou instrução perigosa, segurança vem primeiro. Nunca «dar nota de pronúncia» por texto de Whisper.

## 4.2 Função conceitual de decisão (não executável)

```text
decidir_proximo_passo(contexto_autorizado, estado, evento_do_aluno, rubrica):
  validar identidade, consentimento, versão da sessão e orçamento
  se aluno pede parar / troca objetivo: pausar ou OBSERVAR o novo objetivo
  se evento não é avaliável (ASR incerto, rede, recusa): pedir clarificação segura
  classificar tentativa sob rubrica versionada, registrando incerteza e assistência
  escolher transição CAL autorizada por guard
  selecionar 1 estratégia elegível (idioma de apoio, modalidade, custo, pré-requisito)
  construir TurnPlan com objetivo + instrução + limite de ajuda + checagem
  obter resposta/proposta da LLM somente quando necessária
  validar saída; exibir resposta compreensível; criar candidatos, não fatos oficiais
  persistir SOMENTE eventos/decisões aprovados e vinculados ao aluno/sessão
```

## 4.3 Critérios de seleção por perfil

- **Iniciante absoluto autodeclarado:** orientação em PT-BR, uma frase curta em inglês **com tradução**, instrução explícita, repetição voluntária, microcompreensão observável, pergunta em português.
- **Aluno com desempenho observável mais autônomo:** reduzir apoio gradualmente, ampliar diálogo contextual, inferência com checagem de compreensão, corrigir erros que atrapalham sentido sem interromper tudo.
- **Sem evidência suficiente:** escolher caminho conservador de apoio e sondagem, sem declarar nível CEFR ou diagnosticar habilidade a partir de uma conversa curta.
- **Preferência de áudio/texto ou necessidade de acessibilidade:** selecionar modalidade permitida, permitir troca; não exigir microfone para aprender.
- **Frustração persistente:** reduzir complexidade e oferecer pausa/escolha; não manipular afeto nem usar streak, corações ou gamificação punitiva.

## 4.4 Contratos tipados candidatos (somente para design)

```ts
type CALState =
  | "OBSERVAR" | "ENSINAR" | "PRATICAR"
  | "RETOMAR" | "TRANSFERIR" | "COMPROVAR";

type TutorTurnPlan = {
  sessionId: string; stateVersion: number;
  objectiveId: string; competencyId?: string;
  state: CALState; taskId?: string; rubricVersion?: string;
  strategyId: string; languageSupport: "pt-BR" | "mixed" | "en";
  modality: "text" | "audio" | "multimodal";
  maximumAssistance: "model" | "hint" | "none";
  asksForEvidence: boolean; learnerChoiceAllowed: boolean;
  budget: { maxModelCalls: number; allowASR: boolean; allowTTS: boolean };
};

type LearnerAttemptCandidate = {
  attemptId: string; sessionId: string; objectiveId: string;
  taskId: string; stateVersion: number; modality: "text" | "asr_text";
  answerRef?: string; // armazenar somente com base/consentimento aprovados
  rubricVersion: string;
  assistance: "none" | "hint" | "translation" | "model";
  observedOutcome: "meets" | "partial" | "not_yet" | "not_evaluable";
  assessor: "rule" | "llm_candidate" | "human";
  uncertainty?: string; occurredAt: string;
};

type ProposedTutorAction = {
  proposalId: string; type: "explain" | "practice" | "review_candidate"
    | "transfer" | "pause" | "new_objective" | "memory_candidate";
  source: "naruto"; rationaleCode: string;
  requiresConsent: boolean; idempotencyKey: string;
};
```

**NÃO são schemas de produção.** Faltam discussão de multi-idioma, versionamento, retenção, proveniência, controles de acesso e idempotência distribuída; esses aspectos devem ser decididos em revisão separada antes de qualquer migração.

### Ciclo de vida do turno

1. Cliente envia `interactionId` + `sessionId` + `stateVersion` + mensagem sob autenticação.
2. Servidor recupera versão de estado do **mesmo usuário** e reconcilia concorrência/idempotência.
3. `PedagogicalPolicy` calcula plano **antes** da chamada do modelo.
4. LLM gera somente texto/proposta permitida; parse/validação estrita, anti-invenção e apoio de idioma.
5. Avaliação da resposta do **aluno** ocorre no contexto de uma tarefa real; **o texto que Naruto gerou não é a tentativa do aluno**.
6. O serviço aprova/recusa a transição; grava evento mínimo permitido e retorna mensagem + opções.
7. Retry com a mesma operação retorna resultado idempotente, sem duplicar evidências ou revisão.
8. Se transação conflitar, não inventar sucesso nem sobrescrever o estado do outro dispositivo.

---

# 5. Sistema de avaliação: evidência, retenção e domínio

## 5.1 Escada de evidências (proposta)

| Rótulo interno | Significado | Pode afirmar |
|---|---|---|
| `NOT_OBSERVED` | sem tentativa válida | «Ainda não avaliado» |
| `PRACTICED_WITH_SUPPORT` | execução assistida ou com resposta disponível | «Praticou com ajuda» |
| `INDEPENDENT_ATTEMPT` | execução classificável sem resposta visível, com rubrica | «Conseguiu nesta tarefa sem ajuda» |
| `RETRIEVED_AFTER_DELAY` | recuperação em outra ocasião/intervalo registrado | «Lembrou nesta revisão» |
| `TRANSFERRED` | aplicação verificável em contexto novo, com independência anotada | «Usou em situação diferente nesta atividade» |
| `REVIEWED_EVIDENCE` | conjunto de eventos auditados sob política versionada | «Há evidências de competência X sob condições Y» |

**Nenhum desses rótulos equivale automaticamente a `MASTERED`, a CEFR ou a certificação.** Os critérios de domínio oficial são responsabilidade do Lingua, exigem especificação e validação próprias e podem requerer avaliação humana.

## 5.2 O que conta como comprovação parcial?

Uma evidência candidata útil combina:
- **Objetivo/competência identificados** e **tarefa nova** com rubrica definida **antes** da resposta.
- Resposta efetiva do aluno (ou representação autorizada), data, modalidade, grau de ajuda, contexto e fonte do dado.
- Critério de acerto mensurável, modalidade apropriada e informação de incerteza.
- Quando se deseja alegar retenção: **tentativa em momento posterior**, não uma repetição imediata do mesmo enunciado.
- Quando se deseja alegar transferência: **contexto diferente** do treino, não apenas palavras trocadas superficialmente.

**«Três acertos em contextos diferentes» é uma hipótese de limiar para solicitar revisão da competência, NÃO condição científica universal nem gatilho automático de «aprendido».** Recomenda-se testar rubricas que ponderem independência, variedade de tarefas e retenção diferida. Uma única resposta correta pode ser evidência pontual; três respostas idênticas copiadas podem continuar não demonstrando competência.

## 5.3 Estrutura de dados candidata (sem migração)

**Não criar agora `learnerEvidences`.** Reservar o nome como **proposta**, após inventário das estruturas já existentes no Lingua para não duplicar patrimônio oficial.

Esboço de uma tabela futura **somente se aprovada**:

```text
learnerEvidenceCandidates (NÃO EXISTE; nome conceitual)
  id, userId, sessionId, attemptId UNIQUE por usuário
  competencyId, taskId, rubricVersion, curriculumVersion
  contextTag, modality, assistanceLevel
  result, assessorKind, confidence/uncertainty, provenance
  observedAt, consentSnapshotId, retentionPolicyVersion
  status: proposed | validated | rejected | revoked
  recordVersion, createdAt
```

- O evento validado é **observação**, não «aluno dominou competência».
- Proposta da LLM é sempre `proposed`, jamais `validated` por simples autoconfiança do modelo.
- Conteúdo bruto (respostas, áudios, transcrições) **não fica nessa tabela por padrão**; retenção, hash, referência de objeto e exclusão exigem base/consentimento próprios.
- Gestão de versão, confidencialidade, FKs, índices `userId`, revogação, limpeza, auditoria e política de exclusão precisam de especificação de segurança antes da criação.
- Dados de avaliação oficiais ficam sob regras do **Lingua**, não no repositório do CSLE nem em memória conversacional.

## 5.4 Evitar falsas conclusões

- **SRS `easy` não significa competência dominada.**
- Acerto com dica ≠ acerto independente.
- Repetição imediata ≠ retenção posterior.
- Reconhecimento de fala ≠ avaliação acústica de fonemas.
- Autodeclaração ≠ prova.
- Boa conversa/tempo de tela ≠ aprendizado.
- Texto criado pelo Naruto ≠ resposta do aluno.
- Três acertos ≠ certificação ou nível CEFR.
- Métricas devem incluir casos não avaliáveis, recusa, abandono, condições de assistência e possíveis vieses.

---

# 6. Integração com memória, SRS e futuro CSLE

## 6.1 Memória pessoal: usar sem contaminar aprendizagem

**Leitura:** com consentimento vigente, recuperar `learnerMemories` do usuário autenticado e inserir no `ContextBuilder` como **fatos autodeclarados**, minimizados e não confiáveis como comandos. Ex.: profissão «soldador MIG e TIG» apenas ajuda a selecionar contexto de vocabulário.

**Escrita:** continuar **somente** a proposta literal do turno atual, validação contra a fala do aluno e botão **Sim, guardar**; não usar o estado CAL para salvar memórias silenciosamente.

**Exclusão:** após apagar ou revogar consentimento, o orquestrador não deve reintroduzir a informação de cache, estado pedagógico ou histórico antigo como memória persistente. Testar duas contas, sessões concorrentes e revogação durante um turno.

**Invariante:** conhecer a profissão não demonstra saber dizer a profissão em inglês.

## 6.2 SRS: política de candidatos, nunca inserção/remoção automática

A sugestão do blueprint «errou uma palavra → entra automaticamente no SRS; acertou três vezes → sai» **não está aprovada e viola a separação atual da Constituição**. Substituir por este contrato futuro:

1. Orquestrador observa item elegível em tarefa autorizada, identifica forma, língua, contexto, origem/licença e razão pedagógica; propõe `review_candidate`.
2. `SrsCandidateGateway` valida currículo/competência, deduplicação, direitos de conteúdo, pertencimento ao usuário, retenção e finalidade. **Nada é gravado ainda.**
3. Interface oferece «Quer adicionar esta expressão às revisões?»; após **confirmação do aluno** (ou outra política posterior expressamente aprovada) o serviço **Lingua** cria ou relaciona o item usando APIs oficiais.
4. SRS decide `new/learning/review/relearning`, intervalos e respostas `again/hard/good/easy` segundo `docs/srs-spec.md`; Naruto não escreve `reviewLogs` nem inventa qualidade de revisão.
5. O item **não sai automaticamente** ao terceiro acerto. O aluno mantém controle, e estados/agendas de revisão seguem suas regras próprias; eventual arquivamento/suspensão requer regra aprovada e reversível.
6. Um evento de revisão pode ser usado como **sinal operacional**; não equivale à comprovação da etapa `COMPROVAR`.

**Exceção futura possível:** estudar inclusão automática reversível somente com autorização transparente, consentimento/configuração própria, deduplicação idempotente e auditoria. **Não autorizar nesta v0.1**.

## 6.3 CSLE: preparação sem acoplar

- **Fase 01:** orquestrador Naruto gerencia o ciclo CAL em laboratório, sem ler/alterar motor CSLE.
- **Fase 02:** CSLE evolui isolado, com contratos compatíveis, testes sintéticos e avaliação independente.
- **Fase 03:** adaptador real — sujeito a nova aprovação — pode receber observações **autorizadas e minimizadas** e devolver propostas de estratégia/atividade; a política Lingua valida antes de executar.
- **Fase 04:** comparar Naruto sozinho vs Naruto+CSLE em tarefas equivalentes; medir ganhos, custos, falhas e regressões. Se CSLE falhar, Naruto mantém percurso seguro.

Nenhum marco de **100 pagantes** é necessário para **retomar o desenvolvimento do CSLE**, conforme roadmap vigente. Isso não significa autorização automática para conectar os sistemas.

---

# 7. Observabilidade, segurança e testes de aceite

## 7.1 Auditabilidade mínima futura (não coletar agora)

Evento de decisão **candidato**: `eventId`, `sessionId`, `userId`, `stateBefore/After`, `stateVersion`, `objectiveId`, `taskId`, `strategyId`, `policyVersion`, `rubricVersion`, `decisionReasonCode`, `assistance`, `evaluationStatus`, `latencyMs`, `providerCostEstimate`, `consentSnapshotId`, `createdAt`. Persistência sujeita a minimização, retenção e aprovação; sem transcrição bruta por padrão.

**Ameaças mínimas:** prompt injection em texto de aluno/conteúdo externo; falsificação de memória/certificado; manipulação de rubrica pela LLM; cross-user data; tentativa duplicada; regressão na acessibilidade; vazamento de dados; exceder orçamento; falha de API; negativa de microfone/consentimento; duas abas; estado obsoleto após logout.

## 7.2 Bateria de cenários de aceitação (para implementar em teste futuro)

| ID | Cenário | Resultado obrigatório |
|---|---|---|
| CAL-01 | Iniciante: «não sei nada de inglês» | ENSINAR em PT-BR, exemplo inglês curto + tradução, uma pergunta; nada de conversa longa em inglês |
| CAL-02 | Iniciante pede para repetir | ENSINAR com abordagem alternativa, sem progredir compulsoriamente |
| CAL-03 | Só responde «entendi» | Pode oferecer prática, **não** marcar compreensão comprovada |
| CAL-04 | Três erros verificáveis no mesmo alvo | ENSINAR com nova estratégia; erros de ASR e recusa não contam |
| CAL-05 | Resposta fora do assunto | Respeitar intenção e atualizar OBSERVAR; não tratar como erro |
| CAL-06 | Uma resposta correta com exemplo exposto | Registrar ajuda, nunca domínio |
| CAL-07 | Recuperação com resposta escondida no retorno | Registra intervalo e tentativa; sem falsa memória de revisão |
| CAL-08 | Tarefa diferente do treino original | TRANSFERIR mensurado por rubrica, sem inferir CEFR |
| CAL-09 | Três acertos idênticos copiados | Não promove `MASTERED` |
| CAL-10 | Reconhecedor transcreve `work` quando esperado `walk` | Reportar diferença de **transcrição**, nunca diagnóstico de articulação |
| CAL-11 | Memória autorizada «sou soldador» | Usar para contexto, não afirmar certificação ou fluência |
| CAL-12 | Memória excluída, recusa ou outra conta | Não reutilizar fato excluído nem cruzar contas |
| CAL-13 | Palavra errada durante chat | No máximo criar candidato à revisão, sem inserção silenciosa |
| CAL-14 | Três revisões `easy` | SRS segue agenda; não arquiva automaticamente nem declara competência |
| CAL-15 | Duas abas com `stateVersion` antigo | Rejeitar/reconciliar conflito; não duplicar evidência |
| CAL-16 | Falha/timeout da IA ou ASR | Retorno local honesto, estado íntegro; sem marcar aprendizagem |
| CAL-17 | Revogação de consentimento no meio da sessão | Nenhum salvamento/novo envio não autorizado; invalidar contexto |
| CAL-18 | Modelo gera `I am a certified welder` sem evidência | Bloquear invenção e orientar com frase segura |
| CAL-19 | Pedido de mudança de idioma ou pausa | Respeitar preferência/recusa sem constrangimento |
| CAL-20 | CSLE indisponível na Fase 01 | Sistema não tenta acoplamento nem descreve mock como motor real |

Testes exigidos antes do primeiro código: funções de transição puras, validação de rubrica, propriedade de monotonicidade de versão, isolamento/idempotência, testes adversariais, simulação de custos, fluxos de acessibilidade e comparador pedagógico independente. **Nenhum teste está marcado como executado por este documento.**

## 7.3 Portões de implementação propostos

- **Portão A — Documento (agora):** revisão crítica do Deep e aprovação do fundador sobre estados, dados, custo e consentimento.
- **Portão B — Protótipo sem DB:** máquina de transição pura, catálogo mínimo de microtarefas, eventos sintéticos, testes determinísticos e comparador; **sem deploy**.
- **Portão C — Integração do tutor em branch:** conectar decisões ao `tutor.reply` mantendo provider, consentimento, memória e fallback existentes, feature flag desligada por padrão; CI completo e QA manual.
- **Portão D — Persistência (projeto separado):** somente quando demonstrar necessidade, formalizar schema, segurança, retenção, backup, migration guardada e aprovação.
- **Portão E — Testes de aprendizagem:** observar tarefas de compreensão, recuperação posterior e transferência, com rubricas predefinidas e custos. Sem pressa de declarar superioridade.
- **Fases 02/03/04:** CSLE isolado, integração formal aprovada e correções conforme roadmap. **Stripe #32 congelada** em draft.

## 8. Questões para auditoria do Deep

1. A máquina de estados deve ser **por microcompetência** ou por atividade? Proposta: por atividade com `competencyId` e um objetivo focal; validar sobrecarga e custo.
2. «Três erros» é limite de alternância aceitável para cada tipo de exercício ou deve depender de duração/frustração e tipo de erro? Definir política versionada após teste.
3. Como medir **compreensão observável** com o menor número de interações, sem penalizar estilos de aprendizagem?
4. Quais tarefas permitem correção determinística e quais exigem rubrica humana, IA auxiliar ou resultado «não avaliável»?
5. Quais limiares e contextos permitem **propor revisão de competência** sem fingir domínio oficial?
6. Quais dados mínimos podem permanecer só na sessão, quais precisam persistir com consentimento e como evitar duplicar o banco atual?
7. Quais objetivos devem ser de currículo comum e quais podem ser escolhidos pela curiosidade do aluno?
8. Como preservar custo e latência do Render Free sem reduzir eficácia? Quais medições justificariam uma nova chamada?
9. Quais são as condições de rollback e de não regressão para o chat já funcional?
10. Qual o primeiro experimento comparativo capaz de **refutar** a hipótese de que o orquestrador ensina melhor do que o Naruto baseado apenas em prompt?

**Decisão solicitada:** aprovar, revisar ou rejeitar esta arquitetura; **não confundir aprovação documental com autorização de executar código**.
