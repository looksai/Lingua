# LINGUA + NARUTO + CSLE — CONTEXTO-MESTRE DE CONTINUIDADE

> **LEIA ESTE ARQUIVO PRIMEIRO AO INICIAR QUALQUER NOVA CONVERSA SOBRE O PROJETO.**
>
> **Atualização inicial:** 24/11/2026 UTC (23/11/2026 à noite, horário de Natal/RN).  
> **Repositório principal:** [looksai/Lingua](https://github.com/looksai/Lingua).  
> **Fase atual:** **FASE 01 — Naruto**. Histórico inicial de CI vermelho e branch catálogo vazia está documentado nas seções 5 e 10; **status operacional atualizado na linha abaixo e na seção 18.**
> **ESTADO ATUALIZADO — 24/11/2026 UTC:** **PR #40** aberta, head `d9d3c340`, CI [#45317554127](https://github.com/looksai/Lingua/actions/runs/45317554127) **VERDE**; **PR #41** aberta em **draft**, head `b9b2c8a2`, CI [#45317917864](https://github.com/looksai/Lingua/actions/runs/45317917864) **VERDE**. **AMBAS SEM MERGE E SEM DEPLOY.** Render Live ainda na PR #35; PR #39 está mergeada na main; Stripe #32 pausada; CSLE independente. A seção 18 tem o próximo passo.
> **Natureza:** passagem de bastão completa, especificações, decisões, histórico, pendências e regras de operação. **Não é autorização para alterar código, migrar DB ou fazer deploy.**
>
> **Regra de confiabilidade:** esta é uma fotografia histórica verificável em sua data. Em nova conversa, usar a documentação como contexto, **mas checar o GitHub/CI/Render atuais antes de afirmar o estado de qualquer PR, deploy, migration, custo ou teste**. Datas, PRs e commits podem mudar. O histórico relatado pelo fundador/assistentes deve ser distinguido da evidência direta no código/CI.

---

## 0. TEXTO DE RETOMADA — PARA COPIAR EM UMA CONVERSA NOVA

> Estamos continuando o projeto **Lingua/Naruto/CSLE** do fundador, administrado no GitHub `looksai/Lingua`. Leia **integralmente** `docs/CONTEXTO-MESTRE-LINGUA.md` na branch `main` e depois `docs/ROADMAP-ESTRATEGICO-LINGUA.md`, `docs/CONSTITUICAO-PEDAGOGICA-v0.1.md`, `docs/ORQUESTRADOR-PEDAGOGICO-NARUTO.md`, Issue #38, PRs #40 e #41 e os CIs **mais recentes**. Respeite a ordem **Naruto → CSLE independente → acoplamento auditado → correções → produto/mercado**. Stripe #32 está pausada. Não mexa no Render, no banco, no CSLE ou no Stripe sem minha autorização. **Continue a tarefa aberta descrita na seção “ESTADO OPERACIONAL ATUAL E PRÓXIMAS AÇÕES”**, informando exatamente o que foi confirmado e o que permanece pendente. Não invente que CI, integração, testes humanos ou pagamentos já foram homologados.

O assistente pode resumir brevemente o que leu e **executar a solicitação do fundador**, sem reabrir decisões já tomadas, sem exigir que o fundador copie dezenas de mensagens anteriores.

---

# 1. Identidade, propósito e tese tecnológica

**Produto:** Lingua — plataforma de ensino de idiomas, começando por inglês para falantes de português. Usuário final interage com um tutor conversacional de IA chamado **Naruto** (nome usado nos testes; a visão de produto permite que alunos nomeiem o próprio tutor). O objetivo é **ensinar com excelência comprovável**, não construir apenas um chatbot, nem otimizar métricas vazias de engajamento.

**Visão do fundador:** desenvolver primeiro um professor-IA extraordinário; depois aprofundar o motor educacional independente **CSLE**; então unir ambos sob a governança do aplicativo; estabilizar e só mais tarde priorizar interface, distribuição, Play Store, aquisição e cobrança. Não transformar o Lingua em um SaaS de paywall antes de resolver o ensino.

**Filosofia:** inteligência educacional como núcleo, aplicativo como meio de torná-la acessível. Conduzir o aluno do apoio inicial à autonomia, usar interesse e curiosidade como motor de exploração, mas preservar **currículo base e competências essenciais comuns**, experiência inclusiva em português para iniciantes e evidências reais de retenção e transferência. Um tutor não deve dar aula com inglês incompreensível para quem declarou não saber inglês.

**Ambição:** excelência pedagógica e possível expansão futura além do consumidor individual, incluindo mercados corporativos, institucionais ou de alta performance, sem projetar esses contextos como funcionalidades implementadas nem explorar dados institucionais externamente por padrão. Tecnologias e modelos de IA podem mudar; o domínio, os contratos e os registros oficiais pertencem ao Lingua.

**CRÍTICO:** a meta de criar “o melhor tutor possível” é **direção estratégica**, não fato comprovado, certificação de desempenho ou promessa de fluência. Necessários comparadores fortes, experimentos, rubricas, testes longitudinais, custo, latência e auditoria honesta.

---

# 2. Participantes, papéis e governança

- **Fundador:** define visão, prioridades, escopo e decisões de negócio; **é a autoridade para aprovar** mudanças sensíveis, merges/deploys/migrations e acoplamento real. Atua frequentemente por mensagens curtas em português, chama o assistente de “mano”, quer execução concreta no GitHub com links e checagem do CI.
- **GPT / ChatGPT:** engenharia, arquitetura, auditoria técnica independente, documentação, propostas, implementação em branches autorizadas, testes e leitura de GitHub/Render conectados. Deve questionar requisitos perigosos, não apenas obedecer literalmente. Não afirmar que um sistema funciona sem ter executado o teste correspondente.
- **Deep / DeepSeek:** revisor/auditor externo, interlocutor de especificações e pareceres, frequentemente encaminha ao GPT a autorização do fundador. Parecer via texto do fundador é informação de autorização comunicada, mas **não substitui leitura real do código, evidência técnica e testes**.
- **Manus:** desenvolvedor do aplicativo Lingua refeito do zero com referência ao aplicativo anterior, conforme histórico do fundador.
- **Claude:** parceiro anterior de implementação/planejamento do aplicativo; outras IAs podem revisar propostas, mas não assumem automaticamente autoridade de banco ou deploy.
- **Lingua (software):** autoridade sobre currículo obrigatório, patrimônio de aprendizagem, consentimento, registro oficial de evidências e certificação.
- **Naruto (LLM):** ensina, explica, pergunta, adapta linguagem, oferece exercícios e **propõe** memórias ou revisões; nunca atribui a si mesmo poder de certificar, mudar currículo oficial ou salvar fatos sem consentimento.
- **SRS:** agenda retornos/revisões `new/learning/review/relearning`, avaliações `again/hard/good/easy`; **não prova competência nem domínio**.
- **CSLE:** motor educacional independente para **propor** trajetórias/estratégias/intervenções/candidatos a evidência, sem poder de sobrescrever governança oficial do Lingua.

**Autorização é granular:** aprovar documento ≠ autorizar código; aprovar PR ≠ deploy; CI verde ≠ homologação humana; demo mock ≠ motor real; criar tabela ≠ aplicar migration; chave Stripe de teste ≠ autorização de cobrar.

---

# 3. Roadmap oficial vigente — substitui a pressa de monetizar

Referência primária: [docs/ROADMAP-ESTRATEGICO-LINGUA.md](./ROADMAP-ESTRATEGICO-LINGUA.md).

1. **FASE 01 — Naruto:** tornar o LLM tutor excelente; desenvolver método pedagógico, máquina de estados CAL, repertório, tarefas, rubricas, avaliações, memória com consentimento, limites de ASR, testes e eficiência. **Esta é a fase atual.**
2. **FASE 02 — CSLE:** retomar o **desenvolvimento profundo e independente** do motor. Revisar/fortalecer arquitetura, dados e testes; não acoplar enquanto ainda estiver em laboratório.
3. **FASE 03 — Naruto ↔ CSLE:** contratos auditáveis, integração gradual aprovada pelo fundador, validação dos dados autorizados e governança Lingua; preservar isolamento e fallback.
4. **FASE 04 — Correções:** corrigir bugs, integração, produto, segurança, pedagogia, custos, latência, evidências; estabilizar o conjunto.
5. **FASES POSTERIORES:** polimento visual, recuperação de senha, login social, onboarding aprimorado, beta com alunos reais, distribuição web/mobile, Play Store se fizer sentido, aquisição, preços, Stripe e operação comercial.

**Decisão revogada:** antiga exigência de **100 assinantes pagantes** para destravar desenvolvimento/integração CSLE. O fundador revogou a condição comercial. **Não** revogou controles técnicos: integrar o CSLE de verdade exige contrato, testes, auditoria e aprovação específica.

**Princípios de ordem:** nem Play Store nem Stripe são pré-requisitos para ensinar melhor; o navegador já serve ao beta. É válido conduzir pequenos experimentos pedagógicos durante as fases técnicas, sem fazer marketing/vendas como prioridade. Corrigir vulnerabilidades críticas de segurança pode furar a fila da experiência visual.

**Stripe:** [PR #32](https://github.com/looksai/Lingua/pull/32) permanece **DRAFT / PAUSADA**. Preservar código e CI histórico; **não mergear, não rodar `0008`, não ativar billing, não adicionar chaves por obrigação imediata e não cobrar** até decisão explícita do fundador.

---

# 4. Documentos canônicos e links de navegação

**Leia nesta ordem ao retomar:**

1. **Este arquivo:** [Contexto-mestre](./CONTEXTO-MESTRE-LINGUA.md).
2. **Estratégia atual:** [Roadmap](./ROADMAP-ESTRATEGICO-LINGUA.md).
3. **Norma pedagógica:** [Constituição v0.1](./CONSTITUICAO-PEDAGOGICA-v0.1.md).
4. **Projeto do orquestrador:** [ORQUESTRADOR-PEDAGOGICO-NARUTO.md](./ORQUESTRADOR-PEDAGOGICO-NARUTO.md).
5. **Trabalho em aberto:** [Issue #38 — auditoria Naruto](https://github.com/looksai/Lingua/issues/38), [PR #40 — CAL integrado, SEM merge](https://github.com/looksai/Lingua/pull/40).
6. **Runbook da integração CAL, por enquanto na branch:** [docs/CAL-STAGING-INTEGRATION.md](https://github.com/looksai/Lingua/blob/feat/cal-integration/docs/CAL-STAGING-INTEGRATION.md).
7. **Visão e implementação anterior:** [Visão de Produto](./PRODUCT-VISION.md), [Tutor](./TUTOR-SPEC.md), [Onboarding](./ONBOARDING-SPEC.md), [Relatório do projeto](./lingua-project-report.md).
8. **Memória:** [docs/LEARNER-MEMORY-P0.md](./LEARNER-MEMORY-P0.md), [docs/AIVEN-0007-MEMORY-RUNBOOK.md](./AIVEN-0007-MEMORY-RUNBOOK.md).
9. **SRS, offline, shadowing:** [docs/srs-spec.md](./srs-spec.md), [docs/offline-sync-spec.md](./offline-sync-spec.md), [docs/shadowing-spec.md](./shadowing-spec.md).
10. **Backlog futuro:** [Issue #36](https://github.com/looksai/Lingua/issues/36).
11. **Billing histórico congelado:** [PR #32](https://github.com/looksai/Lingua/pull/32) e runbook `docs/STRIPE-PAYWALL-PHASE1.md` na **branch** `feat/stripe-paywall` (não existe necessariamente na `main`).

**Regra de precedência:** decisões explícitas mais recentes do fundador > roadmap oficial vigente para **ordem de desenvolvimento**; Constituição para **pedagogia, segurança e evidência**; contratos de API/código ativo para comportamento técnico efetivamente implementado. Documentos históricos têm valor de arquivo, não revogam decisões posteriores.

---

# 5. Histórico cronológico essencial (até 24/11/2026)

| Marco | Resultado | Limite |
|---|---|---|
| 2026, ciclos anteriores | CSLE desenvolvido como motor independente, múltiplas versões e experimentos de laboratório | Não há integração real Lingua ↔ CSLE, nem demonstração de eficácia humana |
| Até 20/11 | Backup/checkpoint do CSLE **v3.18.20** reportado com **989/989 testes sintéticos**; constituição v1.1 | Verificar artefatos do CSLE em fonte própria; não presumir que seu código está em `looksai/Lingua` |
| 20–21/11 | Reconstrução do Lingua com Manus; identidade, onboarding, testes, conexão staging Aiven/Render; PRs e migrations anteriores | Algumas propostas históricas ficaram em branches ou precisam checagem do GitHub |
| 21–23/11 | Memória P0 com consentimento, migration **0007** aplicada em staging; guardas de profissão/fatos e iniciantes | Eliminação, revogação e isolamento entre duas contas ainda precisam de homologação completa |
| 23/11 | Fundador aprovou memória testada **em sessão privativa do Firefox**, com recuperação de “soldador MIG e TIG” em nova sessão autenticada | Teste funcional forte, mas não auditoria completa de segurança nem certificação de todos os casos |
| 23/11 | [PR #35](https://github.com/looksai/Lingua/pull/35) mergeada e **única alteração recente vista Live no Render**: explicação em português para iniciantes | Heurística conservadora; não é orquestrador pedagógico |
| 23/11 | [Constituição Pedagógica v0.1](./CONSTITUICAO-PEDAGOGICA-v0.1.md) publicada: quatro camadas e seis etapas CAL | Documento não é código |
| 23/11 | Stripe [PR #32](https://github.com/looksai/Lingua/pull/32) preparada com CI histórico verde, contador/Checkout/webhook/portal na branch | **Pausada; não aplicada migration 0008; não implantado billing** |
| 23/11 | Fundador substituiu estratégia comercial por **Naruto → CSLE → Integração → Correções → Produto/Mercado**; docs e issues atualizados | Não ativou CSLE nem Stripe |
| 23/11 | Especificação [Orquestrador Naruto](./ORQUESTRADOR-PEDAGOGICO-NARUTO.md) aprovada via parecer Deep/fundador | Ainda faltava máquina real |
| 24/11 UTC | [PR #39](https://github.com/looksai/Lingua/pull/39), máquina CAL pura e 28 testes sintéticos, **mergeada**, commit `edca90f4a6b4e020270d6ae79b4c5b833ba64166` | Código está na main; **não foi colocado no Render** |
| 24/11 UTC | [PR #40](https://github.com/looksai/Lingua/pull/40), branch `feat/cal-integration`: diretiva CAL opcional no tutor, flag `CAL_ENABLED` padrão off, microexercício Hello e estado efêmero | **SEM MERGE E SEM DEPLOY**; nova auditoria automatizada em andamento |
| 24/11 UTC | Iniciada bateria adicional `server/cal-router-contract.test.ts` (11 testes com backend tRPC/provider mock), e endurecimento de gatilho do piloto | **CI MAIS RECENTE FALHOU** por teste anterior que espera preview em uma pergunta fora de assunto; corrigir |
| 24/11 UTC | Branch `feat/naruto-microcompetency-catalog` criada a partir de `main` para catálogo pedagógico futuro | **REGISTRO HISTÓRICO SUPERADO: a branch ainda não tinha conteúdo naquela hora; depois recebeu a PR #41** nesta fotografia; não dizer que catálogo já foi entregue |
| 24/11 UTC | Fundador solicitou documento-mestre detalhado para continuidade entre conversas | Este documento representa esse ponto de retomada |

**Ponto importante:** houve vários CI antigos verdes **antes** de commits mais recentes. Não reportar “PR #40 verde” usando somente o [run #45305579759](https://github.com/looksai/Lingua/actions/runs/45305579759), pois o head da PR mudou depois dele.

---

# 6. Infraestrutura e ambiente — não confundir fonte de verdade

## 6.1 GitHub

- **Repositório autorizado do aplicativo:** `looksai/Lingua`.
- **Branch principal:** `main`.
- **Commit de código CAL #39 na `main`:** `edca90f4a6b4e020270d6ae79b4c5b833ba64166`; a `main` recebeu depois commits documentais (contexto-mestre e README). **Conferir SHA atual** antes de trabalhar.
- **PR #40:** branch `feat/cal-integration`, head `d9d3c340f068505d1548f8550116d2c80fee0e87`, CI **verde** [#45317554127](https://github.com/looksai/Lingua/actions/runs/45317554127); sem merge/deploy, sujeito a atualização.
- **PR #41 / Branch catálogo:** `feat/naruto-microcompetency-catalog`, head `b9b2c8a2241abc798c05e169d9b188574f1c1f89`, CI **verde** [#45317917864](https://github.com/looksai/Lingua/actions/runs/45317917864), 8 competências/24 tarefas e 17 testes próprios; **draft sem merge/deploy**.
- **Stripe #32:** `feat/stripe-paywall` pausada, preservada sem merge.
- **Repositórios legados citados em ciclos anteriores:** `looksai/spiral-english` e `looksai/csle-connect`. **Não tocar nesses repositórios** sem instrução explícita. **CSLE não deve ser confundido com o app Lingua**.
- CI principal: `.github/workflows/p0-checks.yml`, tipicamente `pnpm check`, `pnpm test`, `pnpm build`; suíte unitária não prova eficácia de ensino, SQL real ou contrato com LLM externo.
- `vitest.config.ts`: testa `server/**/*.test.ts`, `server/**/*.spec.ts` e `shared/pedagogy/**/*.test.ts`. Essa última inclusão foi corrigida na PR #39; verificar que novos arquivos sempre entram no glob.

## 6.2 Render staging

- **Serviço:** `lingua-p1-staging-le7u`.
- **URL:** https://lingua-p1-staging-le7u.onrender.com
- **ID Render:** `srv-dc0mh2cs728c73ant6e0`.
- **Workspace Render:** `tea-d9g3apb7uimc73e9h5kg` (identificador operacional, **não credencial**).
- **Região:** Oregon; serviço Node; branch `main`; `autoDeployTrigger=off`, PR previews desligados.
- **Deploy Live confirmado por consulta Render nesta atualização:** commit **`3e1188ed058b0de0575a2d56ad8209728a9c462b`** da PR #35.
- **Logo:** main contém CAL puro #39, mas **Render não**. A PR #40 também **não** foi implantada. `CAL_ENABLED` não está em uso real até merge/deploy habilitado.
- **Não fazer deploy** por esta documentação nem pela continuação dos testes automáticos. A aprovação anterior é para desenvolver branches e revisar; implantação real depende de plano/anuência.
- Se alguém disser “Render já está usando CAL”, verificar o SHA live. **Não inferir pelo estado da branch**.

## 6.3 Aiven MySQL

- **Banco staging:** Aiven MySQL 8.4, schema `defaultdb`, conexão TLS/CA; credenciais em secrets, jamais aqui.
- **Migration 0007:** memória persistente `learnerMemories` aplicada em staging e teste real de recuperação entre sessões reportado como bem-sucedido; **NÃO reaplicar**.
- **Backup pré-0007:** workflow manual/criptografado executado anteriormente; **não cobre necessariamente estado após 0007**. Ensaiar restauração quando aprovado; não presumir restauração validada.
- **Migration 0008:** cobrança Stripe **não aplicada**; pertence à PR #32 pausada. Nunca aplicar agora.
- **`learnerEvidences`:** tabela de evidências **NÃO EXISTE** como implementação autorizada do CAL; qualquer proposta requer privacidade, migração, retenção, escopo e revisão separados.
- **Proibição atual:** não alterar dados pessoais, SRS oficial, DB, migrações ou configurações Render apenas para implementar testes CAL.

## 6.4 Configurações relevantes, sem valores secretos

- `LINGUA_TUTOR_ENABLED`, `LINGUA_TUTOR_ALLOWED_EMAILS`: controle de testadores e acesso ao tutor.
- `LINGUA_TUTOR_PROVIDER`: `groq-gemini` (mapeia a Groq) / `openai` / desabilitado conforme servidor.
- `GROQ_API_KEY`, `OPENAI_API_KEY`, modelos selecionados: provedores de texto/ASR/TTS; **NUNCA colocar valores no GitHub nem nas conversas**.
- `LINGUA_TUTOR_MEMORY_ENABLED=true` no staging conforme histórico de validação da memória; se alterar, verificar no Render.
- `CAL_ENABLED`: gate da PR #40; só ativa com string exata `true`, **false/ausente é padrão**; nem sequer efetivo no site até integrar a branch.
- `STRIPE_BILLING_ENABLED`: manter **false**/desligado; sem migração 0008 e chaves reais.
- Os secrets de staging não devem aparecer em documentos, commits, issues ou logs; publicar apenas **nomes de variáveis**.
- Não divulgar tokens, senhas, passphrases, cadeias de conexão, cookies, sessão de alunos ou conteúdo biográfico desnecessário em artefatos.

---

# 7. Constituição Pedagógica — quatro camadas

Referência: [docs/CONSTITUICAO-PEDAGOGICA-v0.1.md](./CONSTITUICAO-PEDAGOGICA-v0.1.md), atualizada para a nova estratégia.

1. **Camada I — Constituição:** aprendizagem observável, compreensibilidade, correção respeitosa, segurança, consentimento e honestidade.
2. **Camada II — Repertório:** input compreensível, chunks, tradução contextual, exemplos, recuperação ativa, repetição espaçada, shadowing, roleplay, leitura/escuta extensivas, produção ativa, feedback, metacognição, simulações de trabalho.
3. **Camada III — Motor decisório:** ciclo CAL e estratégia adaptativa; **nunca apenas “mais um prompt grande”**.
4. **Camada IV — Avaliação:** diferença entre engajamento, desempenho imediato, recuperação diferida, transferência, aplicação autônoma e avaliação externa; **não concluir nível CEFR sem instrumento válido**.

**Ciclo CAL com seis estados:**

`OBSERVAR → ENSINAR → PRATICAR → RETOMAR → TRANSFERIR → COMPROVAR`

A representação em sequência **não exige seis etapas em todo turno**. Há atalhos e retornos justificáveis com guards. Adaptação é transversal ao ciclo. “COMPROVAR” não significa sempre certificado ou domínio permanente; somente observações suportadas por tarefas/condições reais.

**Regras de ouro:**
- “Três erros” é **limiar experimental configurável** para variar estratégia, não lei científica.
- “Três acertos em contextos diferentes” **não concedem** domínio automaticamente; podem sinalizar necessidade de revisão formal.
- Correção com ajuda ≠ produção independente; tentativa imediata ≠ retenção.
- **Whisper/transcrição ASR não é exame acústico de fonemas**. Não dizer que a pronúncia está correta/incorreta apenas porque transcrição casou/diferiu.
- O aluno pode dizer “entendi”, pedir ajuda, mudar de assunto ou parar; isso não conta como prova/erro.
- A LLM não inventa profissão, anos de experiência, certificações, níveis, realizações ou registro de SRS.
- Memória de profissão consentida não comprova habilidade linguística.
- SRS **agenda retorno**, não decide domínio nem decide currículo.
- Gamificação não substitui ensino, e performance aparente não substitui comprovação.
- Nunca prometer fluência em prazo determinado nem superioridade mundial sem experimentos robustos.

---

# 8. Aprendizagem personalizada: fatos pessoais, consentimento e memória

**Teste manual muito importante já realizado:**

1. Conta autenticada em staging e mensagem com fato autodeclarado: **“Sou soldador MIG e TIG”**.
2. Naruto pediu aprovação para guardar a memória.
3. Fundador escolheu **“Sim, guardar”**; UI confirmou salvamento.
4. Atualizou a página; o fato continuou disponível.
5. Abriu **janela privativa do Firefox**, entrou com a **mesma conta**, sem histórico da conversa do navegador anterior; perguntou a profissão.
6. Naruto respondeu que o usuário havia mencionado ser **soldador MIG e TIG**, sem inventar anos de experiência ou certificação.
7. Esse teste é evidência forte de **persistência e recuperação por conta**. Não prova todos os cenários de exclusão, concorrência, isolamento entre duas contas, revogação ou não retenção por caches.

**Fronteira de dados:**
- Memória pessoal aprovada é **autodeclaração**, não conhecimento certificado ou dado curricular.
- `server/learner-memory.ts`: valida fato literal do turno atual, categoria e consentimento. A gravação ocorre em ação separada da interface.
- `server/tutor-fact-guard.ts`: proteção conservadora para qualificações/experiência inventadas; **não é detector universal de alucinações**.
- `shared/tutor-language.ts`: identifica iniciante absoluto por autodeclaração/memória autorizada e força apoio em português quando necessário. Heurística de correção pode perder o contexto se a resposta for substituída; testar.
- Não inserir em prompt dados privados sem consentimento ativo.
- **Informação oferecida no turno atual pode ser usada para responder ao turno atual**; para reutilização entre sessões depende de consentimento e memória aprovada. Não exigir que todo fato útil do turno atual esteja previamente no banco.
- Apagou/revogou memória? Nenhum fallback/cópia de estado pedagógico pode restaurar a informação como lembrança persistente.
- Metadados de exercício CAL **não são** conteúdo biográfico nem substitutos da memória durável.

**Pendências de QA manual/automatizado:** excluir memória e tentar resgatar em nova sessão; pedir para não guardar; duas contas diferentes; revogar consentimento durante turno; janelas simultâneas; falhas do banco.

---

# 9. Máquina CAL pura — PR #39 já incorporada à main

**PR:** https://github.com/looksai/Lingua/pull/39  
**Commit merge squash:** `edca90f4a6b4e020270d6ae79b4c5b833ba64166`  
**Arquivo:** `shared/pedagogy/cal-machine.ts`  
**Testes:** `shared/pedagogy/cal-machine.test.ts` — **28 testes sintéticos**.  
**CI que verificou a PR:** [#45303187314](https://github.com/looksai/Lingua/actions/runs/45303187314) — sucesso histórico antes do merge.

**Contrato efetivamente implementado no código puro:**
- `CAL_STATES`, tipo `CALState`: seis etapas.
- `newCALSession(sessionId)`: snapshot inicial em `OBSERVAR`, versão 0, sem objetivo/evidência.
- `stepCAL(state, event, policy)`: função **sem efeitos externos**; aceita/rejeita evento por `sessionId`, `expectedVersion`, `eventId`, estado, tarefa e guard; retorna motivo e novo snapshot.
- Eventos exemplares: `OBJECTIVE_DEFINED`, `MODEL_PRESENTED`, `COMPREHENSION`, `ATTEMPT`, `START_RECALL`, `START_TRANSFER`, `SUMMARIZE`, `RESET_OBJECTIVE`, `NEEDS_HELP`, `PAUSE`, `RESUME`, `CLOSE`.
- `DEFAULT_CAL_POLICY`: `reteachAfterErrors=3`, `maxReteachCycles=2`, `delayedRecallThresholdMs=86400000` (1 dia como **limiar de classificação de oportunidade**, não garantia pedagógica).
- Avaliador `rule` ou `human` como classificações confiáveis apenas **se verificados pelo servidor**; `llm_candidate` e `asr_only` não têm autoridade de comprovação.
- Observações guardam IDs, contexto, assistência, resultado e data, não resposta textual/áudio cru.
- `chooseCALPlan`: seleção de estratégia determinística, preferência de português/áudio consentido, `maxAdditionalModelCalls:0`.
- `summarizeCAL`: agrega observações; três contextos independentes pedem revisão; `certification:"not_assessed"`.
- `proposeSRSFromError`: **só candidato** com `requiresLearnerConsent:true`; não insere/deleta SRS.
- `PedagogicalEngine`: interface futura de proposta; **não instancia CSLE**.

**Limitações que não devem ser esquecidas:**
- Idempotência e histórico de eventos no snapshot são limitados (até 80 IDs/observações); **não duráveis**.
- Nem toda “tentativa correta” representa uma habilidade real; depende de tarefa válida, apoio e rubrica.
- Estado sintético não vale como garantia de sincronização entre processos ou contas reais.
- Nenhum evento dessa máquina foi persistido no banco.

---

# 10. Integração gradual CAL no tutor — PR #40 EM ABERTO

**PR:** https://github.com/looksai/Lingua/pull/40  
**Branch:** `feat/cal-integration`  
**Status:** aberta, **não mergeada**, aguardando auditoria Deep e teste de staging posterior.  
**Flag:** `CAL_ENABLED` ausente/false → caminho antigo; string exata `true` → piloto.  
**Arquivos centrais:**
- `server/cal-integration.ts` — `CALTutorSessions` efêmero e `calDirective`.
- `server/cal-integration.test.ts` — testes unitários do piloto.
- `server/cal-router-contract.test.ts` — testes **novos** de fluxo `tutor.reply` com provedores/DB simulados.
- `server/tutor-router.ts` — entrada da política somente após consentimento/autenticação, diretiva antes da LLM, commit após resposta segura.
- `server/tutor-free-provider.ts`, `server/tutor-provider.ts`, `shared/tutor.ts` — parâmetro opcional `pedagogicalDirective` acrescentado sem substituir as regras existentes.
- `docs/CAL-STAGING-INTEGRATION.md` — runbook na branch.

**Comportamento intencional (piloto limitado):**
- Por `ctx.user.id`, `CALTutorSessions` guarda snapshot provisório em Map de processo; **TTL 30 minutos**, **até 100 contas** no processo; perda após reiniciar.
- Ativa exercício fechado apenas quando há intenção de aprender **e necessidade explícita/confiável de suporte de iniciante**. Genericidade “quero inglês para entrevista” sem iniciante não deve ser sequestrada pelo exercício.
- Primeiro exercício fixo **“Hello = Olá”**: ensinar e perguntar significado; resposta “Olá”/“Oi” pode abrir PRATICAR; solicitar o cumprimento “Hello”.
- **Resposta do modelo não prova aprendizagem**; só habilita avaliação quando a pergunta concreta foi realmente apresentada. Guard de fatos e guard pt-BR continuam soberanos.
- “Entendi” sozinho não comprova; “não sei” pede reensino, não conta erro; ASR/LLM como juiz fonético não entram.
- Se o aluno perguntar outra coisa, não forçar o exercício nem marcar resposta errada.
- Prática imediata “Hello” usa `assistance:"model"`, logo **não** comprova recuperação independente.
- Após 3 erros fechados verificáveis pode retornar ENSINAR com outra estratégia (experimental).
- **Não cobre no chat integrado** tarefas plenas de RETOMAR/TRANSFERIR/COMPROVAR; somente a máquina pura conhece essas transições.

**Histórico do CI anterior às correções (RESOLVIDO; ver estado atualizado na seção 18):**
- [Run #45305579759](https://github.com/looksai/Lingua/actions/runs/45305579759) — **success** para versão antiga da PR, com **185 testes**.
- Head atual conferido: **`95501394d71b41eebb58d4295906b4a81b1ee948`**, que adiciona `server/cal-router-contract.test.ts` e endurece o gatilho do piloto.
- [Run #45316857589](https://github.com/looksai/Lingua/actions/runs/45316857589) — **failure**: os **11 novos testes de contrato passaram**, mas um teste antigo falhou:
  `server/cal-integration.test.ts` → «a learner question is not graded as a wrong answer». Antes, esperava `r?.phase === "ENSINAR"`; agora o comportamento seguro de pergunta fora de assunto retorna **`null`** (bypass CAL) e o teste precisa ser atualizado para conferir ausência de avaliação.
- O teste de tipo passou nesse run; o build foi pulado devido à falha da suíte.
- **NOTA HISTÓRICA SUPERADA:** a PR #40 estava vermelha no primeiro head; esta falha foi corrigida e o CI do head atualizado está verde.
**ATUALIZAÇÃO:** o teste obsoleto foi corrigido na PR #40; CI verde no [run #45317554127](https://github.com/looksai/Lingua/actions/runs/45317554127), SHA `d9d3c340`. O catálogo PR #41 também tem CI verde [#45317917864](https://github.com/looksai/Lingua/actions/runs/45317917864), SHA `b9b2c8a2`. **Ambas sem merge/deploy.**

- **Não mergear #40 nem deployar até CI verde + auditoria.**

**O que foi revelado na auditoria:**
1. Gatilho inicial amplo demais podia trocar objetivo legítimo do aluno por “Hello”. O código foi restringido, exigindo sinal de iniciante; perguntas off-topic bypass CAL.
2. Resposta “tchau” a “o que significa Hello?” podia ser confundida com pedido de pausa; lógica foi desambiguada.
3. Teste de mock HTTP reutilizava um `Response` já consumido; substituído por implementação que cria response nova.
4. Nenhuma análise feita pela LLM deve virar nota/competência oficial.
5. O código atual não é pronto para múltiplos nós ou persistência. Não expandir antes de catálogo, rubricas e auditoria.
6. Evitar prometer estado durável, retenção diferida ou latência medida só porque existem métodos e testes sintéticos.

---

# 11. Catálogo pedagógico de microcompetências — PR #41 ENTREGUE EM BRANCH

**PR:** [#41](https://github.com/looksai/Lingua/pull/41) · **branch:** `feat/naruto-microcompetency-catalog` · **status:** aberta em **draft, não mergeada nem deployada** · **head:** `b9b2c8a2241abc798c05e169d9b188574f1c1f89` · **CI VERDE:** [#45317917864](https://github.com/looksai/Lingua/actions/runs/45317917864).

**Arquivos criados:**
- `shared/pedagogy/microcompetency-catalog.ts`: catálogo puro com `MicroCompetency`, `MicroTask`, 8 competências versionadas, 24 tarefas, grafo de pré-requisitos, regras de validação e checador conservador de respostas.
- `shared/pedagogy/microcompetency-catalog.test.ts`: **17 testes sintéticos** de currículo, gabaritos, grafo acíclico, ajuda, perguntas, ASR, tarefas abertas e ausência de domínio.
- `docs/NARUTO-MICROCOMPETENCY-CATALOG.md` na branch: instruções de auditoria e limites.

**Conteúdo inicial:** `greeting.hello`, `greeting.good-morning`, `greeting.goodbye`, `courtesy.please`, `courtesy.thank-you`, `identity.my-name`, `work.welder-example` e `conversation.what-do-you-do`. **Alex e o soldador dos exemplos são personagens fictícios**, não identidade nem carreira do aluno. A profissão autodeclarada só pode ser reutilizada entre sessões após consentimento.

**Cada competência contém:** tarefa fechada de significado, tarefa fechada de expressão e tarefa aberta de transferência. **Aberta exige revisão; nunca pontuação automática.** `evaluateClosedMicrotask` só emite `rule_candidate`: resposta pontual sem domínio, CEFR ou registro oficial. Perguntas, “não sei”, ajuda, e modalidade `asr_text` resultam **não avaliável**, não erro. O catálogo não é currículo completo nem prova de eficácia.

**Falha real corrigida pelos testes:** a normalização lexical removia `?` antes da regra que deveria detectar perguntas. O primeiro CI da PR #41 falhou em dois casos; o verificador foi corrigido para testar o sinal antes da normalização e a suíte passou no head `b9b2c8a2`.

**Invariantes:** nenhum DB, `learnerEvidences`, gravação de memória, SRS automático, modelo externo, CSLE, Stripe ou runtime do Naruto é tocado nesta PR. Um futuro adaptador `TaskCatalog → CAL → Naruto` precisa de nova implementação e decisão.

**Próximo passo:** auditoria Deep da PR #41 juntamente com #40, depois decisão expressa do fundador. **Não mergear ou colocar no Render automaticamente.**

---

# 12. Motor de decisão: prioridades e regras técnicas

A arquitetura desejada separa:
1. **Autenticação, autorização, consentimento, isolamento e segurança** (bloqueios duros).
2. **Intenção atual do aluno e acessibilidade**; respeitar interrupção/pergunta fora de tópico.
3. **Fatos e correções críticas**; evitar invenções, riscos e diagnóstico indevido.
4. **Objetivo curricular e pré-requisitos** governados pelo Lingua.
5. **Estado CAL e resultado de atividade com rubrica**; decidir próximo passo em função de evidência válida, não de elogio da IA.
6. **Preferências, contexto, motivação e modalidade** (texto/áudio).
7. **Custo/latência** dentro de estratégias pedagogicamente seguras.

**Motor não deve chamar LLM adicional só para decidir estratégia**; regras locais selecionam plano, LLM preenche explicação/atividade conforme permitido. Usar `maxAdditionalModelCalls:0` no piloto; se futuras chamadas auxiliares forem necessárias, justificar custo/ganho em experimento.

**Política de erros:** limiar 3 como hipótese configurable; apenas tentativas válidas do mesmo objetivo com pergunta efetivamente apresentada; não contar silêncio, recusa, ASR inconclusivo, pergunta nova ou tempo perdido.

**Retorno ao ensino:** após dificuldade comprovada, trocar estratégia ou reduzir dificuldade, não repetir texto idêntico para sempre; evitar frustração e oferecer pausa.

**Avaliação:** observar com rubrica pré-definida, identificar ajuda, momento/contexto, não atribuir confiança excessiva a julgamentos auto-referenciais da LLM. `learnerEvidenceCandidates` é **nome conceitual**, não tabela existente.

**Pontes de futuro:** `PedagogicalEngine` recebe observações autorizadas e **propõe** recomendações; Lingua decide; CSLE só será integrado na Fase 03.

---

# 13. CSLE independente — arquitetura, histórico, limites e visão futura

**Não confundir dois produtos:**
- **Lingua** = aplicativo e titular de governança pedagógica/usuário.
- **CSLE** = motor educacional universal e potencialmente licenciável para aplicações e setores diferentes.

**Checkpoint relatado pelo fundador e pelas entregas anteriores:** **CSLE Engine v3.18.20**, backup independente, cerca de **989/989 testes reportados** (há histórico que menciona ~440 arquivos de motor e ~75 documentos MD). Esses números pertencem ao **relatório de contexto anterior**, **não foram recontados nesta inspeção do GitHub Lingua**. Recuperar o backup original/verificar hashes antes de programar o CSLE, e não confundir testes internos com superioridade demonstrada em estudantes.

**Constituição conceitual CSLE v1.1 e princípios a preservar:**
- Formação base comum obrigatória com trajetórias **lineares, circulares, espirais e interdisciplinares**.
- Flexibilidade guiada pela curiosidade, sem perder objetivos de competência final.
- Profundidade e velocidade adaptativas; acompanhamento de conceitos-âncora e dificuldades.
- Autonomias em aquisição, aplicação, transferência e exploração; construir autonomia, não dependência do professor.
- Diferenciar patrimônio **intelectual, pedagógico e motivacional**, sem alegar inferência clínica/biológica ou estados mentais não observáveis.
- Aprendizagem concreta, profundidade, retenção, transferência e aplicação, não manipulação de engajamento.
- Propostas de intervenção **reversíveis** e com transparência.
- Dados pedagógicos para inteligência coletiva/trabalho científico somente com autorização efetiva, minimização, anonimização real quando necessária e governança; dados corporativos/militares/institucionais segregados sem reutilização externa por padrão.
- Motor universal, desacoplado de fornecedor LLM, idioma e aplicativo; arquitetura orientada a contratos.
- Máxima: **“CSLE orquestra a aprendizagem; a IA fornece o conhecimento”** (princípio conceitual, não alegação de implementação integrada).

**Componentes/ideias históricas relatadas:** Curriculum Lock; Arboreal Engine; Cognitive Anchor; módulos de memória, Universal AI Bridge/Router, Adaptative Intelligence, Orchestrator, Curiosity/Multimodal, Consolidation, avaliação/predição, inteligência coletiva, governança e roteamento; termos próprios CSR/MHA/GDCA/IAL são referências de constituição e precisam ser conferidos no backup **antes** de qualquer alteração.

**Limites laboratoriais explicitamente conhecidos:** provedores/dados simulados em parte da bateria; ausência de validação humana da eficácia; espiral não demonstrou vencer revisão espaçada em todos os comparadores; analogias de transferência podem ser inválidas; algoritmos de domínio podem sofrer erros correlacionados/excesso de rigor; segurança, persistência, integrações, logs, direitos e auditoria independente ainda exigem validação. **Não afirmar 989 testes = 989 evidências de aprendizagem.**

**Fase 02 (futura):** recuperar o backup e seus documentos oficiais, executar suíte, revisar contrato/constituição e comparar com bases fortes. **Não fazer isso agora por antecipação**, pois Fase 01 Naruto tem precedência.

**Fase 03 (futura):** `PedagogicalEngine`/adaptador formal recebe observações consentidas com proveniência e devolve **propostas**; Lingua aceita/rejeita; CSLE não grava patrimônio oficial diretamente. Possuir feature flag, fallback, QA, custo, rollback, revogação, auditoria e aprovação do fundador. **Não integrar uma simulação ou mock fingindo motor real.**

---

# 14. SRS, avaliação e patrimônio oficial

**SRS atual tem lógica própria e algumas APIs de revisão**; não inferir que seus eventos demonstram domínio. Documentar que:
- Itens podem estar em `new`, `learning`, `review`, `relearning` (conforme especificação SRS).
- Usuário pode classificar `again`, `hard`, `good`, `easy`; um `easy` não prova fluência.
- O Naruto pode **sugerir** candidato de revisão a partir de erro confiável em atividade adequada.
- **Não** fazer “errou uma palavra → adicionar SRS silenciosamente”.
- **Não** fazer “três acertos → remover do SRS” automaticamente.
- Precisaria de confirmação do aluno e validação pelo Lingua antes de persistir.
- Memória biográfica, logs de revisão, evidência de tarefa e domínio formal são **quatro coisas diferentes**.
- `COMPROVAR`: para alegar competência, estabelecer variedade de contextos, assistência, intervalo temporal e rubrica válida; caso insuficiente registrar **incerteza**.
- `CEFR` é referência de competências, não uma etiqueta concedida por três perguntas.
- Dados oficiais pertencem à política Lingua, não ao texto do chat ou módulo CSLE.

---

# 15. Voz, provedores e limitações práticas

**Fluxo atual observado no código do Lingua:**
- `server/tutor-router.ts`: tRPC protegida, perfil em `learnerProfiles`, `consent`, `provider`, `history` (até **8 mensagens**), `message` (até **1200 caracteres**), texto/áudio opcional e fallback.
- `server/tutor-free-provider.ts`: Groq chat; modelo padrão do código `openai/gpt-oss-120b` salvo configuração; ASR `whisper-large-v3-turbo`; adaptador de Gemini para **demonstração de frases FIXAS**, sem enviar dados pessoais ao modelo gratuito.
- `server/tutor-provider.ts`: adaptador OpenAI chat/ASR/TTS, com chave/seleção via ambiente; **bridge legada de áudio** explicitamente limitada no código até **06/01/2027** — revisar antes de depender dela.
- `shared/tutor.ts`: prompt de sistema exige português compreensível e tradução de microfrase em inglês, fatos autorizados e limite de resposta; perfil/interesse é dado, não instrução.
- `shared/tutor-language.ts`: `needsAbsoluteBeginnerSupport` e `enforceBeginnerPortuguese`; cuidado com fallback que substitui resposta em vez de repará-la.
- `server/tutor-fact-guard.ts`: protege alguns padrões inventados de certificação/experiência; cobertura parcial.
- `server/tutor-budget.ts`: proteção de uso em memória do processo (30 requests/usuário/dia; total 100/dia; até 2 chamadas ativas), **não** quota durável comercial.
- A voz do navegador “**Voz local (alternativa)**” pode ser TTS local de leitura, **não prova** que o texto do tutor veio de fallback sem IA.
- **Nunca atribuir diagnóstico fonético a Whisper** com base em transcrição. Pode-se oferecer comparação lexical/transcricional e ressalva explícita de incerteza.
- Não ativar custos extras de múltiplos agentes por turno sem justificar latência/custo/ganho pedagógico.
- Ao testar, usar mocks/fakes sem segredos nem requisições reais; custos com provedores pagos só quando testador/gestor autorizar.

---

# 16. Stripe / faturamento — código preservado, fora de prioridade

**PR #32 — status real:** aberta, **draft**, pausada; nenhum merge ou deploy.  
**Objetivo futuro:** cobrar assinatura de testes a US$ 9,90/mês após produto pedagógico estável; preço pode ser reavaliado pelo fundador.

Trabalho histórico implementado na branch de billing:
- Trial de **72h** a partir da primeira resposta da IA ou **20 respostas da IA**, o que ocorrer primeiro; contador por conta, com reservas concorrentes e idempotência.
- Modal `LIMIT_REACHED`, checkout Stripe sandbox, assinatura, webhook HMAC/idempotência, Portal do Cliente.
- Esquema `drizzle/0008_billing_staging.sql` e workflows de backup e migration guardada, **ainda não aplicados**.
- CI histórico verde de implementação, mas **não há comprovação por pagamento Stripe sandbox real** nem homologação de produção.
- Ao retomar em fases posteriores: backup **pré-0008 atual**, testes de restauração, inspeção do schema, migration só sob aprovação, chaves `sk_test_`, webhook real em ambiente de teste, liberação Premium após pagamento confirmado, isolamento de contas, reembolsos/cancelamentos, custo/latência, segurança.
- **Não reabrir essa frente agora** e não confundir flag `CAL_ENABLED` com billing.

---

# 17. Histórico de PRs e decisões relevantes

| Identificador | Descrição/decisão | Estado na fotografia |
|---|---|---|
| [#30](https://github.com/looksai/Lingua/pull/30) | Primeiras bases de memória com consentimento | Mergeada anteriormente, segundo histórico |
| [#31](https://github.com/looksai/Lingua/pull/31) | Migration de memória 0007 | Mergeada, aplicada em staging uma vez |
| [#32](https://github.com/looksai/Lingua/pull/32) | Stripe/paywall completo em branch; fase comercial postergada | **ABERTA / DRAFT / PAUSADA** |
| [#34](https://github.com/looksai/Lingua/pull/34) | Backup criptografado anterior à 0007 | Mergeada no histórico; restauração não confirmada |
| [#35](https://github.com/looksai/Lingua/pull/35) | Segurança pedagógica para iniciante absoluto pt-BR | **MERGEADA E LIVE NO RENDER** |
| [#37](https://github.com/looksai/Lingua/pull/37) | Sincronização técnica `main` → branch billing antes de congelar | Mergeada na branch billing, não é deploy |
| [#39](https://github.com/looksai/Lingua/pull/39) | Máquina CAL pura + 28 testes | **MERGEADA NA MAIN**, não deployada |
| [#40](https://github.com/looksai/Lingua/pull/40) | CAL gradual no tutor, corrigido bypass, 11 testes de fronteira | **ABERTA; CI verde #45317554127; sem merge** |

| [#41](https://github.com/looksai/Lingua/pull/41) | Catálogo inicial 8 microcompetências/24 tarefas, 17 testes de currículo | **ABERTA/DRAFT; CI verde #45317917864; sem merge** |
| [Issue #36](https://github.com/looksai/Lingua/issues/36) | UX, acesso, estudo e conta — subordinados ao roadmap | Aberta, backlog posterior |
| [Issue #38](https://github.com/looksai/Lingua/issues/38) | Auditoria integral e baseline do Naruto | Aberta, tarefa atual |

**Atenção:** branches criadas, PRs abertas e commits não representam validação pelo fundador. Nunca editar branches legadas arbitrariamente nem aplicar mudanças de billing como dependência do CAL.

---

# 18. ESTADO OPERACIONAL ATUAL E PRÓXIMAS AÇÕES — LEIA ANTES DE PROGRAMAR

**Esta seção é o ponto de retomada da tarefa que estava sendo executada quando o fundador interrompeu para solicitar a documentação.**

## 18.1 O que o fundador autorizou nesta rodada

Mensagem: “Perfeito, vamos seguir”, após aprovação da estratégia de:
1. Auditar e fortalecer automatizadamente a PR #40.
2. Corrigir bugs revelados.
3. Abrir PR independente do **catálogo de microcompetências**.
4. Não realizar deploy, merge da #40, migration, Stripe, CSLE real ou testes humanos forçados enquanto fundador está ocupado.

Depois solicitou **salvar máximo contexto no GitHub** porque conversas longas travam e novos chats perdem decisões.

## 18.2 O que foi concluído nesta rodada

**Continuidade entre conversas:**
- Criado o arquivo-mestre `docs/CONTEXTO-MESTRE-LINGUA.md` na `main`, com mais de 54 mil caracteres na primeira versão e instruções de retomada, histórico, visão, CSLE, Naruto, infra, testes e limites.
- O README principal passou a apontar para este arquivo como **LEIA PRIMEIRO**. Nenhuma credencial secreta foi incluída.

**Auditoria automatizada da PR #40:**
- Rota tRPC `tutor.reply` auditada com Groq/OpenAI simulados; consentimento, isolamento entre contas, flag `CAL_ENABLED`, falha de IA e proteção de fatos mantidos.
- Criado `server/cal-router-contract.test.ts`, com **11 testes** de fronteira autenticada.
- Corrigido gatilho do exercício “Hello” para não sequestrar pedidos legítimos de quem não declarou necessidade de suporte absoluto; perguntas alheias à tarefa têm bypass e não são marcadas como falha.
- CI inicial acusou teste antigo incompatível com o novo bypass; expectativa atualizada e checado que não houve observação/erro fictício.
- **Resultado confirmado:** PR #40 head `d9d3c340f068505d1548f8550116d2c80fee0e87`, CI [#45317554127](https://github.com/looksai/Lingua/actions/runs/45317554127) **SUCCESS** (TypeScript, Vitest, build). **NÃO mergeada; NÃO deployada.**

**Catálogo curricular na PR #41:**
- Branch antes vazia agora tem catálogo de **8 microcompetências e 24 tarefas**, 17 testes próprios, documento de auditoria e [PR #41](https://github.com/looksai/Lingua/pull/41) em **draft**.
- O CI encontrou que normalização removia a pontuação antes de detectar perguntas: corrigido sem diminuir a prudência da avaliação.
- **Resultado confirmado:** PR #41 head `b9b2c8a2241abc798c05e169d9b188574f1c1f89`, CI [#45317917864](https://github.com/looksai/Lingua/actions/runs/45317917864) **SUCCESS** (TypeScript, 20 arquivos de teste, build). **NÃO mergeada; NÃO deployada.**
- Ambas usam apenas testes automáticos; **não foi avaliada a eficácia com alunos reais**.

## 18.3 PRÓXIMAS AÇÕES AO RETOMAR — estado corrente

1. **Enviar ao Deep as PRs #40 e #41 com seus SHAs e runs de CI verdes.** Pedir revisão de código, catálogo, anti-hijack, assistência, respostas não avaliáveis e regras de segurança.
2. **Não realizar merges/deploy/migrations sem autorização do fundador.** A PR #40 está pronta para revisão e #41 está draft. A versão Render Live ainda não possui CAL ativo nem o catálogo.
3. Após parecer: planejar um **adaptador `Catálogo → CAL → Naruto`** que respeite a escolha do aluno, atividades versionadas e fallback, usando feature flag desligada por padrão. A ligação real exige nova decisão e testes.
4. Quando o fundador tiver tempo, desenhar QA manual de `CAL_ENABLED=true` em staging autorizado, com allowlist e rollback. **Não solicitar teste agora como bloqueio**, pois o fundador informou estar ocupado.
5. Continuar Fase 01: comparar ensino sem/com CAL, tarefas, custos, latência, retenção posterior e transferência sem afirmar vantagem antes da evidência. **CSLE continua independente (Fase 02 futura)**; **Stripe #32 continua pausado**.
6. Atualizar esta mesma seção depois de cada avanço; conferir status novo do GitHub antes de agir.

## 18.4 “Done” só quando houver prova

Para cada PR documentar:
- SHA do head testado;
- IDs/status das execuções GitHub Actions;
- arquivos alterados;
- resultados de testes automatizados, incluindo novos casos e regressões;
- limitações não cobertas;
- merge/deploy/migration de fato realizados ou **explicitamente não realizados**;
- autorização necessária para próxima etapa.

**Nunca usar CI verde de SHA antigo como aceite da branch atual.**

---

# 19. Riscos técnicos e pedagógicos ainda abertos

1. **Persistência CAL:** somente Map no processo, sem sincronização, sem retomada após restart; não confundir com memória durable Aiven.
2. **Identidade do aluno:** `userId` vem do contexto autenticado, nunca do cliente; limitações de replay em mais de um nó.
3. **Qualidade da tarefa:** verificar que prompt verdadeiro foi mostrado; se LLM parafrasear, pode haver falso negativo; não inventar acerto.
4. **Respostas fora de assunto:** o CAL deve **ceder prioridade à intenção atual**; não sequestrar conversa nem forçar “Hello”.
5. **Português de iniciante:** não perder pergunta e objetivo ao corrigir resposta muito inglesa.
6. **ASR/TTS:** transcrição não significa pronúncia; fallback de áudio pode ser local.
7. **Autodeclaração de profissão:** fato do turno atual ou memória consentida, nunca experiência/certificado inferido.
8. **Condição de três erros:** testar frustração e variáveis pedagógicas, não usar como dogma.
9. **Três acertos:** no máximo gatilho de revisão, sem domínio automático.
10. **SRS:** nenhuma inserção/remoção sem política e consentimento.
11. **Coleta pedagógica:** nenhuma gravação de áudio/transcrição bruta/eventos oficiais sem aprovação de privacidade e retenção.
12. **LLM hallucinations:** guard regex é barreira conservadora, não garantia universal.
13. **Comparador pedagógico:** nenhuma prova de superioridade do CAL sobre Naruto simples até avaliação com rubricas.
14. **Custos:** limite `withTutorBudget` atual é por processo; não atribuir controle de faturamento durável.
15. **Segurança:** testes completos de exclusão/revogação e duas contas ainda pendentes.
16. **Ambiguidade no contexto de erro:** “tchau” pode ser resposta errada ao exercício ou pedido de encerrar; respeitar contexto.
17. **Continuidade entre conversas:** documentação precisa ser mantida no GitHub; modelo não deve usar memória pessoal como fonte técnica mais recente do que código/CI.
18. **Infraestrutura:** Aiven 0007 está aplicado; nunca executar migration duas vezes; não rodar 0008 por acidente.
19. **Render:** auto deploy off; main não corresponde a live; validar SHA.
20. **Governança:** nenhuma ação sensível a partir de suposta “aprovação total” que na prática se referia a documento ou testes sintéticos.

---

# 20. Protocolo de atualização deste documento-mestre

**Objetivo:** cada nova conversa termina com o contexto técnico indispensável atualizado em um lugar estável. Esta documentação é uma “memória de engenharia”, não substitui dados do aplicativo.

Depois de cada milestone:
1. **Checar** GitHub, PRs, CI, branch, Render e migrations **quando pertinentes**.
2. Atualizar **Data/Status do cabeçalho**, seção **5 Histórico**, seção **17 PRs**, seção **18 Estado operacional** e novas descobertas relevantes.
3. Se uma tarefa foi concluída, mover o resultado para “feito” com commit/CI e apontar a **nova tarefa pendente**; não deixar instrução antiga como a primeira ação vigente.
4. Preservar decisões fundadoras e motivos históricos; marcar **REVOGADA** explicitamente quando mudarem.
5. Não sobrescrever avaliações negativas ou pendências com linguagem promocional.
6. **Não inserir credenciais, URLs com tokens, emails pessoais, segredo de DB, conteúdo bruto de aluno, logs com PII ou senhas.**
7. Para alterações grandes, acrescentar referência a documentos próprios e manter esta página como mapa + estado verificável.
8. Publicar na **`main`** as atualizações **somente documentais explicitamente autorizadas**, sem arrastar código não revisado de branches.
9. Lembrar que uma nova conversa pode começar sem o histórico longo; por isso cada seção precisa ser inteligível sozinha.
10. Ao concluir atualização, devolver ao fundador **o link fixo** do arquivo e uma frase curta de retomada.

**Formato mínimo para bloco “mudanças recentes” futuro:**

| Data (UTC) | Autor/decisão | PR/commit/CI | O que mudou | O que NÃO mudou | Próxima ação |
|---|---|---|---|---|---|
| 2026-11-24 | Fundador autorizou documentação e continuidade de Fase 01 | Contexto-mestre inicial | Registro de estado e dívida técnica | Render/DB/Stripe/CSLE inalterados | Corrigir CI #40 e iniciar catálogo |

---

# 21. Prompt curto alternativo de retomada

**Use quando estiver com pressa:**

> Mano, continuamos o Lingua. Leia o arquivo-mestre **https://github.com/looksai/Lingua/blob/main/docs/CONTEXTO-MESTRE-LINGUA.md**, consulte o GitHub/CI atuais e execute a primeira ação pendente da seção 18. A prioridade é Naruto/qualidade pedagógica; Stripe pausado; CSLE separado; sem deploy/DB sem minha autorização. Me diga no final os commits, testes e o que ficou pendente.

---

# 22. Observações finais de rigor epistêmico

- **“Implementado”** = código existe no branch/commit indicado; **“mergeado”** = GitHub registra merge; **“deployed”** = Render confirma commit Live; **“testado”** = suíte/usuário testou aquele caminho; **“aprendido”** = só quando há avaliação pedagógica válida da competência. Nunca usar esses termos como sinônimos.
- Este projeto tem muitas revisões por várias IAs; se Deep, Manus, Claude e GPT discordarem, usar **Constituição + evidências + decisão explícita do fundador**, registrar trade-offs e não ocultar contradições.
- **Não adivinhar** credenciais, resultados de PRs, migrations ou situação de bancos.
- **Fase 01 não busca maximizar quantidade de funcionalidades**; busca eficácia, generalização, clareza, segurança e baixo custo, com evidências progressivamente fortes.
- **O fundador está temporariamente ocupado para testes manuais** e autorizou continuidade de desenvolvimento e QA automatizado; não bloquear o trabalho exigindo prints ou navegação agora. Teste com aluno real será solicitado somente quando houver build aprovado.
- A conquista de memória entre sessões já é um marco técnico, mas **não valida automaticamente o método de ensino**. O próximo marco é provar que as decisões CAL ajudam a aprender.
- **Toda ação de implementação deve terminar com atualização deste documento de contexto**, ou ao menos com a proposta clara de registro, para que a continuidade sobreviva à troca de conversa.

---

**ESTADO-RESUMO ATUALIZADO EM 24/11/2026 UTC:** `main` contém PR #39 mergeada e documentação de continuidade; Render Live continua na PR #35 (`3e1188ed`). PR #40 **CI VERDE #45317554127**, head `d9d3c340`, aberta/não mergeada/não implantada. PR #41 **CI VERDE #45317917864**, head `b9b2c8a2`, aberta/draft/não mergeada/não implantada. Stripe #32 pausada, migration `0008` não aplicada; memória `0007` em staging; CSLE independente. **Próximo passo: auditoria Deep das PRs #40/#41 e decisão explícita do fundador antes de qualquer integração/deploy.**
