# Fase 01 — Integração real do catálogo com tutor.reply (PR para auditoria)

**Data inicial:** 24/11/2026 UTC. **Situação:** implementada em branch isolada; NÃO mergeada; NÃO deployada; aguarda CI e auditoria.  
**Nova flag:** CAL_CATALOG_ENABLED **desligada por padrão**. Só ativa se **CAL_ENABLED=true** também. O Render staging tem CAL_ENABLED=true para o **piloto Hello antigo**, mas **CAL_CATALOG_ENABLED não foi configurada**, portanto continua OFF.

## Objetivo e fronteira

Integrar pela primeira vez os componentes **catálogo v0.1** (PR #41), **adaptador puro** (PR #42) e **rota autenticada tutor.reply** (PR #40), sem substituir o tutor e sem presumir que os seis estados do CAL já foram completados com evidência real.

Arquivos:
- \`server/cal-catalog-runtime.ts\`: controlador de sessão volátil por ID de conta autenticada, escolha explícita de objetivo, emissão de tarefas versionadas e avaliação somente após resposta segura.
- \`server/tutor-router.ts\`: \`catalogCompetencyId\` opcional no input de \`tutor.reply\`, política ativada somente com duas flags; permanece na rota com consentimento e allowlist, antes da chamada ao Groq/OpenAI e depois da validação de texto seguro.
- \`server/cal-catalog-runtime.test.ts\` e \`server/cal-catalog-router.test.ts\`: testes puros e testes de fronteira tRPC com provedor e DB *simulados*.
- \`server/cal-router-contract.test.ts\`: fixa flag de catálogo OFF para impedir mudança de comportamento em regressões do piloto Hello.

## Contrato de flags (importante)

| CAL_ENABLED | CAL_CATALOG_ENABLED | Comportamento |
|---|---|---|
| Ausente/false | Qualquer | Tutor anterior sem CAL |
| true | Ausente/false | **Piloto Hello** existente, sem mudanças |
| true | true | **Novo modo de catálogo**; não inicia Hello automaticamente. Atividades específicas via escolha do aluno e conteúdo original do catálogo |
| false | true | Novo modo também OFF |

**Nenhum segredo ou configuração Render foi alterado por esta PR.** Staging permanece no piloto Hello até autorização posterior para ligar a flag nova.

## Seleção do assunto

1. A escolha via UI futura pode passar \`catalogCompetencyId\`, validado contra IDs do catálogo no servidor. O valor do navegador não prova domínio ou qualquer pré-requisito.
2. A escolha por mensagem natural só é feita com **pedido de ensino explícito** e termos suficientemente claros; exemplos:
   - "Quero aprender a me apresentar" → \`identity.my-name\`;
   - "Quero aprender a falar da minha profissão" → \`work.welder-example\` (**exemplo fictício** de soldador, não inferência sobre o aluno);
   - "Quero praticar bom dia" → \`greeting.good-morning\`;
   - "Quero aprender a perguntar a profissão" → \`conversation.what-do-you-do\`;
   - "Quero aprender por favor" → \`courtesy.please\`.
3. "Sou soldador" (fato, não pedido de aula) ou "Quero aprender a pedir direções" (assunto ainda inexistente neste pequeno catálogo) **não fazem a IA escolher silenciosamente outra competência**.
4. "Não sei inglês, quero começar do zero" sem tópico explícito oferece **um menu curto** e pede ao aluno que escolha; isso não cria competência nem nível.
5. Mudar de objetivo explicitamente reinicia a meta CAL **somente nessa sessão volátil**, sem transportar erros ou conceder pré-requisitos.

## Emissão da tarefa e checagem

O processo é:
\`\`\`
aluno autenticado + acesso permitido + consentimento
  → escolha explícita de objetivo ou resposta a tarefa válida
  → adaptador puro escolhe competência/tarefa e gera ticket NÃO entregue
  → única chamada usual à IA (sem segundo agente)
  → guardas de afirmações pessoais + português para iniciante
  → servidor concatena tarefa original, integral, ao texto seguro
  → servidor confirma que o template compõe a resposta construída
  → commit CAS do estado volátil desse usuário
  → cliente recebe resposta
\`\`\`

A confirmação é de **montagem da resposta pelo servidor**, não uma prova de que o navegador exibiu a tela ou que o aluno viu a tarefa. Não há telemetria de entrega nem evidência oficial.

- Resposta digitada fechada pode produzir **candidato interno** de acerto ou erro (quando o distrator está catalogado). Resposta desconhecida, ASR, dúvida, pedido de ajuda e mudança de assunto **não** são erro por padrão.
- Resposta correta imediata em \`PRATICAR\` continua marcada como **assistida**; não gera domínio, certificado, CEFR ou “aprendido”.
- O controlador **não promove automaticamente** a RETOMAR/TRANSFERIR/COMPROVAR; o catálogo ainda tem conjunto pequeno de tarefas e revisão aberta exige rubrica.
- A resposta da LLM **não decide rubrica nem conteúdo canônico**; o template versionado vem exclusivamente do servidor. Não armazenar respostas cruas.
- Em correção do idioma iniciante que substituiria toda a saída da IA por uma frase fixa sobre "Hello", o modo novo usa introdução neutra em PT-BR antes de adicionar sua atividade correta — assim não mistura currículo indevidamente.

## Segurança e limitações

- \`Map\` por \`ctx.user.id\`, máximo de 100 sessões e 30 minutos de inatividade; descartado após restart, **sem compartilhamento entre nós**.
- \`complete()\` só é chamado após resposta segura do provedor e guardas do tutor; uma falha/negação de consentimento não altera a sessão.
- *Compare-and-swap* em memória impede que conclusão atrasada de outro pedido sobrescreva estado mais recente; ainda não há transação distribuída nem idempotência persistente.
- \`CAL_CATALOG_ENABLED\` não é autorização para gravação de \`learnerEvidences\`, SRS ou notas.
- O campo \`catalogCompetencyId\` só escolhe um ID permitido; não vem acompanhado de evidência ou informação biográfica.
- O input opcional `inputModality:"asr_text"` informa que o cliente enviou texto transcrito; nesse caso **não há avaliação fechada**. Se o campo faltar, a rota assume texto digitado por compatibilidade; isso **não é uma autenticação da origem da transcrição**. Alterações futuras de UI devem marcar a origem corretamente, e nenhuma correspondência textual pode certificar pronúncia.
- Se duas respostas de IA terminarem fora de ordem, a resposta atrasada **não exibirá uma tarefa cujo ticket perdeu a corrida**: o controlador retorna apenas o texto seguro sem apêndice e não altera a sessão. Uma apresentação ainda não está confirmada pelo navegador; essa é uma salvaguarda de consistência apenas no servidor.
- Uma palavra que seja resposta catalogada **de outro domínio pedagógico** (p.ex. “Olá” durante uma tarefa sobre nome) não é classificada como erro. Distratores só podem valer dentro do mesmo domínio; o resultado ainda é candidato local.
- A transcrição ASR enviada como se fosse texto digitado pela UI ainda não tem atestado de origem confiável; **nunca diagnosticar pronúncia** nesta fase.
- O modo depende de templates simples; não funciona ainda como currículo completo para entrevistas ou pedir direções.
- O feedback da IA pode continuar sujeito a inconsistências; testes de mock não substituem QA humano. O modelo recebe instruções para não duplicar perguntas, mas apenas o template vindo do servidor é autoridade de avaliação.
- O usuário pode usar pergunta livre durante a tarefa: isso não é nota, a sessão anterior fica pendente; o tutor responde sem atividade forçada.

## Critérios de auditoria/portão

1. CI verde em branch real: TypeScript, Vitest com novos testes e build.
2. Testar caso de falha do Groq, resposta inventando certificações, consentimento false, conta sem login, flag OFF, flag de catálogo OFF com CAL piloto ON, caso de mudança de intenção e janela concorrente.
3. Confirmar que texto do servidor não é truncado antes de gabarito e que as respostas diferentes não viram erro automático.
4. Auditar risco de ambiguidade de objetivo e de texto de LLM com perguntas próprias; considerar futuro formato de **atividade estruturada no cliente** e ACK confiável de renderização.
5. **Sem merge nem deploy nesta etapa.** Fundador revisa/autoriza integração para staging; flag nova continua ausente.
6. Só após QA real autorizado com aluno, projetar avaliação/retention e futura tabela \`learnerEvidences\`, sob governança do Lingua.

**Rota de rollback futura:** se a nova flag for ativada com autorização e apresentar regressão, ajustar \`CAL_CATALOG_ENABLED=false\` somente no staging e confirmar o deploy gerado pela alteração de configuração. Isso devolve o piloto CAL anterior sem alterar o banco.
