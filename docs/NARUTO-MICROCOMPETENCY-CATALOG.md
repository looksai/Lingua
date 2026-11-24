# Catálogo de microcompetências Naruto — Fase 01, v0.1

**Estado:** artefato curricular/avaliativo inicial, **não integrado ao runtime**. Revisão Deep e aprovação do fundador necessárias antes de uso com alunos. Nenhum DB, SRS, CSLE, deploy ou pagamento.

## Finalidade

Dar ao futuro orquestrador CAL escolhas de conteúdo versionado e pequenas tarefas reprodutíveis, em vez de ensinar sempre uma única frase. O catálogo não concede ao Naruto autorização para mudar currículo oficial ou atribuir proficiência. Segue [Constituição Pedagógica](./CONSTITUICAO-PEDAGOGICA-v0.1.md), [Orquestrador](./ORQUESTRADOR-PEDAGOGICO-NARUTO.md) e [Roadmap](./ROADMAP-ESTRATEGICO-LINGUA.md).

### Estruturas

- \`shared/pedagogy/microcompetency-catalog.ts\`: \`MicroCompetency\`, \`MicroTask\`, \`MICROCOMPETENCIES\`, \`MICRO_TASKS\`, \`validateMicrocatalogue\`, \`evaluateClosedMicrotask\`, busca e elegibilidade.
- \`shared/pedagogy/microcompetency-catalog.test.ts\`: testes puros de grafo, acentos, respostas, asr/transferência e proteção de domínio.
- O catálogo contém **8 competências iniciais e 24 tarefas**: uma de reconhecimento de sentido, uma de produção lexical controlada e uma aberta de transferência por competência.
- Tarefas abertas **não recebem gabarito automático**. Requerem rubrica/contexto e revisão futura. As fechadas podem produzir apenas \`rule_candidate\`, não evidência oficial.
- Voz/transcrição \`asr_text\` permanece **não avaliável** no validador; nenhum diagnóstico fonético a partir de texto.

### Sequência proposta (não é CEFR)

1. \`greeting.hello\` — Hello/Olá.
2. \`greeting.good-morning\` — Good morning/Bom dia.
3. \`greeting.goodbye\` — Goodbye/Tchau.
4. \`courtesy.please\` — Please/Por favor.
5. \`courtesy.thank-you\` — Thank you/Obrigado(a).
6. \`identity.my-name\` — My name is Alex; **nome e pessoa fictícios**.
7. \`work.welder-example\` — I am a welder; **personagem fictício**, salvo se o aluno realmente se identificou assim no próprio turno ou autorizou memória.
8. \`conversation.what-do-you-do\` — What do you do? como pergunta de profissão em um contexto de entrevista.

Todos os itens possuem IDs estáveis, modelo inglês, tradução, objetivo em pt-BR, pré-requisitos, estratégias, tarefas e rubricas. Há validação de referências e ciclos do grafo.

### Limites de interpretação de respostas

- Resposta curta a um exercício fechado (ex.: “Hello” para “Olá”) é apenas correspondência pontual. No piloto do CAL, geralmente é **prática assistida**, pois a palavra foi recém-modelada.
- Uma transcrição ASR coincidente não é prova de pronúncia. O catálogo devolve \`not_evaluable\` nesse modo.
- “Não sei”, pergunta, silêncio e pedido de ajuda não são marcados como erro.
- Correção exata é deliberadamente conservadora: frases mais abertas ou respostas igualmente válidas não previstas pelo gabarito **não devem ser usadas para reprovar ou classificar globalmente o aluno**. Ampliação exige rubricas/contexto e validação real.
- Desafios de transferência não podem virar domínio por coincidência lexical. Podem pedir revisão e posterior teste diferido.
- Três acertos não concedem \`MASTERED\` nem CEFR; SRS permanece separado e só recebe itens por consentimento autorizado.

### Governança

**Lingua** define currículo e evidência oficial. \`MicroCompetency\` não é proposta CSLE, tampouco decide calendário SRS. O tutor Naruto pode usar futuramente texto/atividades do catálogo, após adaptador revisado e confirmação de que a pergunta foi realmente apresentada.

**Atenção:** o catálogo contém uma progressão **candidata**, não um programa curricular completo, nem teste de nível, nem superioridade comprovada de ensino. Para o futuro, testar diversidade de aprendizes, cognatos, ambiguidades de tradução, resposta em linguagem natural, acessibilidade e ensino autônomo. Não incorporar à PR #40 automaticamente.

### Critérios de auditoria antes de integrar ao Naruto

1. CI verde com a nova suíte incluída em \`shared/pedagogy/**/*.test.ts\`, TypeScript e build.
2. Prerequisitos e IDs auditados, grafo acíclico, versionamento e exemplos ficcionais explícitos.
3. Rubricas fechadas permitem \`not_evaluable\`; transferência aberta não avaliada por correspondência exata.
4. Estratégias e tarefas não alteram memória pessoal nem inferem profissão/certificação sem consentimento.
5. Definir como o catálogo conectará objetivos escolhidos pelo aluno às tarefas e evitar o “Hello compulsório”.
6. Comparar qualitativamente com a experiência atual antes de abrir caminho para deploy. **Nada nesta PR autoriza merge nem deploy.**

**Próxima entrega possível:** desenho e testes de um adaptador \`TaskCatalog → CAL\` com simulações de percurso e monitoramento de fallback. Esse adaptador **não** é parte desta PR.
