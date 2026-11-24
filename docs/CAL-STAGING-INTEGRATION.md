# CAL — integração gradual no tutor — revisão e plano de testes

**ESTADO ATUALIZADO EM 24/11/2026:** PR #40 **mergeada** na `main`, junto com #41 (catálogo) e #42 (adaptador puro). **CAL_ENABLED=true foi configurado exclusivamente no staging** `lingua-p1-staging-le7u`. Render confirmou deploy **LIVE** `dep-dc2gjim7bikc738kf1r0`, commit `58718a4f3a6f5f4aad199607c2d6c8e91f4190d1`, às `2026-11-24T03:52:52Z`. **O tutor real usa apenas o piloto CAL da frase Hello; o catálogo e seu adaptador ainda NÃO estão ligados ao `tutor.reply`.** Sem migration/banco/SRS/CSLE/Stripe. O fundador ainda não executou QA manual.

**Registro oficial:** [Ativação do CAL staging, verificação e rollback](./CAL-STAGING-ATIVACAO-2026-11-24.md). As instruções abaixo são o **runbook histórico/prático** que precedeu o deploy e continuam úteis para QA, mas os itens "não fazer deploy" não descrevem mais a situação atual de staging.

## Scope mínimo

- **`CAL_ENABLED`**: nova variável de ambiente; **desligada por padrão** (qualquer valor diferente de `true` conserva o fluxo anterior). **Não habilitar enquanto não existir ambiente/teste explicitamente aprovado.**
- Entrada em `tutor.reply` **somente depois de** autenticação, autorização prévia de IA e carregamento opcional de memórias autorizadas. O limitador de testadores `LINGUA_TUTOR_ALLOWED_EMAILS` e o orçamento de chamadas existentes continuam ativos.
- `CALTutorSessions` cria **estado efêmero em memória do processo por `userId` autenticado**; expira por ociosidade após 30 min, limite de 100 contas por processo. Sem registrar mensagens/voz, fatos biográficos ou evidências no banco. Reiniciar o Render **perde esse estado**. Múltiplas instâncias **não compartilham o estado**. Estado **não é** patrimônio de aprendizagem e não pretende dar continuidade entre dispositivos.
- O backend seleciona **estado CAL e estratégia** via `stepCAL` / `chooseCALPlan` **sem chamadas externas**. Anexa diretriz de servidor ao prompt de sistema preexistente, sem substituir regras de segurança, idioma, honestidade ou memória. Os adaptadores Groq e OpenAI recebem essa diretiva como argumento **opcional**; com flag off nada muda.
- Após **resposta de IA bem-sucedida e aprovada pelos guardas**, registra somente evento local de apresentação. Se a resposta **contiver de fato** a pergunta fechada esperada, habilita a avaliação da próxima fala. **Texto gerado pela IA não conta como tentativa do aluno.**
- Exercício-piloto **fixo** e limitado: `Hello = Olá`. Etapa ENSINAR pergunta «O que significa Hello em português?» e aceita «Olá»/«Oi» quando a pergunta realmente apareceu. Etapa PRATICAR pede «Como você cumprimentaria alguém em inglês?» e verifica «Hello», sem declarar retenção independente: a assistência é marcada como **model**, pois a palavra foi apresentada há pouco.
- Em PRATICAR, três erros verificáveis na microtarefa podem acionar **ENSINAR com estratégia diferente**, como hipótese versionável da máquina CAL. Pedido de ajuda não vira erro; conteúdo não avaliável não vira acerto.
- **Não foi implementada** a avaliação automática de transferência, retenção diferida ou comprovação oficial. Para esses casos, o CAL puro já define contratos e guardas, mas a integração real não possui tarefas/rubricas para promovê-los honestamente. Esse é o próximo incremento, após auditoria.
- Nenhum evento de `SRS` é criado; nenhuma memória é gravada automaticamente; nenhuma tabela `learnerEvidences` existe; o CSLE continua isolado. A PR #32 do Stripe continua pausada.

## Por que não usar diagnóstico livre de erro/acerto por LLM?

Um texto como «Muito bem!» é saída do tutor, **não evidência de aprendizagem**. O aluno pode ter usado outra intenção ou uma transcrição de fala pode estar errada. Esta PR usa somente respostas breves a tarefas explícitas, com gabarito fechado e proveniência local, e não atribui nota global. O escopo intencionalmente restrito evita criar **falsas comprovações**.

## QA histórico de implantação e QA manual ainda pendente

1. CI P0 verde **incluindo `server/cal-integration.test.ts` e `shared/pedagogy/cal-machine.test.ts`**; TypeScript e build.
2. Auditoria Deep do isolamento entre usuários, prompts adicionais, validação da pergunta de treino, reversão da flag e atribuição das tentativas; revisão do fundador.
3. **ATUALIZAÇÃO:** a implantação autorizada já ocorreu e está Live no Render staging; o deploy foi automaticamente disparado pela atualização do ambiente. O CI integrado também passou na PR #43 (somente QA, ainda draft). O antigo plano abaixo foi substituído por esta execução controlada.
4. **Agora liberado para QA manual quando o fundador puder:** manter allowlist de testadores e testar com `CAL_ENABLED=true` no staging; não confundir CI com teste humano. Sequência recomendada:
   - «Naruto, eu não sei nada de inglês. Quero aprender do zero.» → ENSINAR; exemplo + tradução e uma pergunta de compreensão em português.
   - «Olá» → PRATICAR, se Naruto realmente perguntou «O que significa Hello?».
   - «Hello» → feedback de prática, **sem** dizer que já domina ou aprendeu para sempre.
   - «Goodbye» três vezes, diante do exercício válido de cumprimentar → mudar estratégia e voltar a ENSINAR.
   - «Não sei» → ajuda sem contar erro.
   - Pergunta fora de tópico → resposta respeitosa sem nota nem erro automático.
   - Memória de «soldador MIG/TIG» **continua funcionando** e não se transforma em certificação.
5. Reiniciar servidor ou aguardar 30 min → estado piloto reiniciado; isso **é esperado**, não falha de memória pessoal. Conferir duas contas/duas abas, fallback, indisponibilidade Groq e latência. Não alegar retenção longa nesta versão.
6. **Rollback de teste:** desligar `CAL_ENABLED` e fazer deploy da configuração autorizada. Sem alterações em dados.
7. Não promover a produção, não adicionar coleta permanente e não conectar CSLE antes de nova aprovação.

## Limitações conhecidas para auditoria

- A camada de estado é **in-process**; identidade por `ctx.user.id`, mas não sincroniza usuários com múltiplos processos, e dois nós podem ter estados diferentes. Não há promessa de persistência longitudinal.
- A checagem «pergunta realmente apresentada» usa detecção conservadora do texto do tutor; se ele parafrasear a pergunta, o piloto pode **não contar** a resposta. Preferimos falso negativo a falso acerto.
- A microtarefa fixa não representa uma intervenção pedagógica geral. As tarefas serão ampliadas apenas com catálogo aprovado, rubricas e avaliação real.
- Prática correta imediatamente após ensinar **não satisfaz** recuperação independente nem transferência. Nenhum "domínio" será escrito.
- Timer para inatividade de dois minutos **não** está nesta PR: requer UX, consentimento, ritmo e prevenção de mensagens intrusivas.
- O flag não prova que o CAL melhora ensino; será necessário comparar atividades com/sem a política usando rubricas e resultados de alunos.

**Decisão solicitada para próxima etapa:** auditoria da PR, validação do plano de testes e autorização específica do ambiente de staging. Até lá, **código apenas em branch**, sem merge e sem deploy.
