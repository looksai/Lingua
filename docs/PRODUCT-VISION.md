# Lingua — Visão de Produto e Constituição da Reconstrução

**Versão:** proposta 1.0 · 21/11/2026  
**Status:** EM REVISÃO — decisões técnicas pendentes de aprovação expressa do fundador e de Deep.  
**Natureza:** especificação, não implementação; nenhum código de feature, migração ou deploy é autorizado por este documento.

## 1. Decisão de produto

O Lingua será uma plataforma multilíngue de aprendizagem **guiada por tutor proativo**, com experiência acolhedora para duas portas de entrada igualmente legítimas:

- **Explorador curioso:** chegou sem objetivo definido, talvez entediado, mas quer ser surpreendido e experimentar algo de valor imediatamente.
- **Estudante com objetivo:** quer comunicação cotidiana, carreira, viagem, estudo, mídia, certificações externas ou outro propósito. Não presumir ocupação, idade, preferência profissional ou nível.

**Promessa testável:** em poucos momentos o aluno entende como o tutor o acompanha, experimenta uma interação real e pode começar uma jornada própria, sem histórico ou resultados inventados. O diferencial não é um avatar que fala; é coordenação responsável entre conversa, conteúdo significativo, revisão, prática, observações e proposta adaptativa.

**Metas de produto:** confiança pedagógica, prazer de aprender, autonomia, profundidade, transferência de contexto e retenção real a verificar. Não prometer fluência rápida ou superioridade do CSLE sem estudo comparativo.

## 2. Três camadas com autoridade separada

1. **Lingua — autoridade institucional/produto:** identidade, currículo obrigatório, objetivos, conteúdo revisado, metadados de idioma, consentimentos, patrimônio oficial de aprendizagem, políticas de evidência, acesso, certificação e decisões finais. É dono das APIs que escrevem estado durável.
2. **Tutor — agente de interação:** conversa, escuta, explica, sugere atividades, propõe vocabulário candidato, lembra preferências autorizadas, orienta leitura, chama revisões e acolhe dúvidas. Não altera currículo, cria evidência oficial, certifica nem grava memória sem passar pelas regras do Lingua.
3. **CSLE — motor pedagógico independente, INTEGRAÇÃO FUTURA:** recebe exclusivamente observações e patrimônio autorizados, propõe trajetórias e candidatos a evidência com justificativa, incerteza e auditoria; não tem autoridade curricular/certificadora. O SRS agenda retorno, não prova competência.

**Fronteira obrigatória:** Tutor → proposta estruturada → validação/consentimento no Lingua → registro auditável → CSLE futuro (se autorizado) → decisão final do Lingua. Nenhum prompt ou saída da LLM é autorização para executar escrita no banco.

## 3. Pedagogia híbrida: preservar o validado, reinventar a experiência

A aprendizagem deve combinar, com sequenciamento pedagógico revisável:

- **Input compreensível e diversificado:** ouvir, ler, encontrar vocabulário em contexto, conteúdo interessante, níveis de dificuldade ajustáveis, fontes/licenças verificadas.
- **Recuperação e revisão espaçada:** SRS por item, espaçamento e recuperação ativa; o tutor pode propor oportunidades naturais de recuperar palavras vencidas, mas NÃO marcar sucesso SRS por menção casual ou por fluência aparente.
- **Output significativo:** conversas, escrita, narrativas, resolução de problemas e tarefas pertinentes ao objetivo; não depender de múltipla escolha.
- **Feedback corretivo:** específico, proporcional, não humilhante, com oportunidade de tentar novamente; registrar modalidade e quantidade de ajuda.
- **Profundidade, transferência e retenção:** reavaliar depois de intervalos e em novos contextos; distinguir acerto guiado de desempenho autônomo.
- **Autonomia:** aluno pode explorar, pausar, corrigir, silenciar o tutor, pedir tradução, voltar à âncora e interromper voz.

A LLM cria explicações e atividades candidatas; itens curriculares publicados devem possuir revisão e versão. A contextualização pode mudar o caminho, mas não elimina competências finais obrigatórias.

**Cuidado com afirmações científicas:** SRS e recuperação têm base empírica geral; a eficácia de nossa combinação Tutor+CSLE será hipótese até medirmos resultados comparáveis e consentidos.

## 4. Jornada do produto

**Visitante:** landing page viva → demonstração opcional, claramente isolada e sem dados atribuídos → criar conta/entrar.

**Novo aluno:** identidade validada → tutor se apresenta com identidade neutra → aluno dá nome ao tutor e define se quer voz → escolhe idioma da interface, idioma nativo e idioma-alvo → conversa inicial breve que descobre interesse/objetivo → diagnóstico adaptativo de compreensão, escuta e produção com opção texto/voz e esclarecimento de limites → resultado explicável, com incerteza → plano inicial versionado e opção de revisar → primeira experiência real → memória/progresso verdadeiros.

**Aluno recorrente:** saudação baseada em eventos reais e consentidos → objetivo da sessão proposto com razão compreensível → alternar conversa, ouvir, ler, escrever, revisar e praticar → registro mínimo e revisão posterior → próxima sessão retoma o que realmente ocorreu.

**Exploração livre:** interação inicial de valor em até um pequeno número de ações; sem obrigatoriedade de formulário longo antes de encantar. Perfil persistente e diagnóstico formal só depois da escolha de criar conta. O aluno pode adiar o diagnóstico; a jornada exibirá claramente suas limitações.

## 5. Diferenciais sem copiar mecanismos nocivos

- Tutor nomeado pelo estudante, voz e tom ajustáveis; uma relação pedagógica contínua, transparente e substituível.
- Proatividade visível e opt-in, somente com app aberto por padrão; jamais captar áudio continuamente sem acionamento explícito.
- Personalização por curiosidade e necessidade sem apagar currículo.
- Assistência ativa em leitura e vídeo: tutor oferece contexto, diálogo e retorno à lição.
- Acompanhamento da revisão SRS sem competir com tarefas significativas.
- Dados e raciocínio pedagógico legíveis: por que esse exercício, o que foi observado, o que falta confirmar.
- Visual marcante e personalizável, com pelo menos tema claro/escuro, paletas, tipografia legível, ícones funcionais, microinterações acessíveis e redução de movimento.
- Motor e fornecedores intercambiáveis, com métricas e limites de custo desde o projeto.

**Exclusões da fase inicial:** promessas de fluência automática, gamificação manipulativa, publicidade disfarçada de tutor, ouvintes de microfone ocultos, certificação feita por LLM, currículo gerado sem revisão, ranking de pessoas e coleta silenciosa de dados.

## 6. Internacionalização real

Separar obrigatoriamente:

- **interfaceLocale:** idioma das telas e configurações, com BCP 47 (ex.: pt-BR, en-US, es-ES).
- **nativeLanguage:** idioma do estudante para explicações, conforto e configurações do tutor.
- **targetLanguage:** idioma de aprendizagem, com versão de currículo e metas específicas.
- **voiceLocale/voiceId:** parâmetros por voz, independentes dos três anteriores.
- **contentLocale/proficiencyScale:** metadados do material e referência de progressão.

Evitar textos montados diretamente no JSX, instruções gramaticais traduzidas literalmente e conteúdo fixo para inglês. Currículos de idiomas diferentes precisam de metas, corpus, fonética, avaliação e curadoria próprias. Primeira oferta comercial recomendada: pt-BR → inglês, com infraestrutura extensível; priorizar idiomas adicionais segundo demanda real e capacidade editorial, não alegar suporte pedagógico apenas por traduzir a interface.

## 7. Experiência visual e acessibilidade

Princípio: acolhedora, expressiva, surpreendente, porém clara; não parecer ferramenta corporativa estéril nem brinquedo infantil.

- Identidade consistente: cor semântica, ícones, estados de botão, animações discretas e avatar/estado do tutor, sem antropomorfização enganosa.
- Tela de conversa e espaço de aprendizagem integrados; tutor acessível sem esconder leitura/revisão.
- Preferências persistentes: temas, contraste, tamanho de fonte, legendas, velocidade de fala, modo silencioso, voz e tom.
- Leitura por teclado, leitores de tela, WCAG como referência, alto contraste, texto alternativo, feedback não dependente exclusivamente de cor.
- Suporte a conexão fraca e estado offline honesto, sem dizer que resultados foram sincronizados sem ACK do servidor.
- Mobile-first: dimensionamento de botões, consumo de dados/áudio, permissões e desempenho em aparelhos modestos.

## 8. Qualidade, aprendizagem e métricas

**Diferenciar métricas operacionais de domínio.** Métricas candidatas:
- primeiro valor percebido: % de visitantes que concluem uma interação proveitosa sem cadastro e decidem continuar;
- primeiro contato: taxa de conclusão de perfil e diagnóstico por modalidade, desistências e motivos;
- latência do tutor: tempo até resposta em texto, tempo até primeiro áudio, interrupção/barges, falhas, custo por sessão;
- aprendizagem: pré/pós com instrumentos comparáveis, retenção 7/30/90 dias, transferência a contextos novos, erros recorrentes, necessidade de ajuda e evolução longitudinal;
- confiança: controles de voz usados, respostas incorretas detectadas, transparência, opt-outs e exclusão;
- acessibilidade e experiência: resposta em conexões lentas, testes com leitores de tela, compreensibilidade do feedback.

Antes de afirmar ganho acima dos apps existentes, desenhar experimentos controlados, com autorização e grupos comparáveis. Nenhum resultado simulado entra em dashboards de contas.

## 9. Reutilização do repositório (inventário inicial)

**Preservar e auditar:** autenticação própria/sessões, Drizzle + Aiven, operações SRS/idempotência, fila offline por usuário, laboratório de leitura, shadowing local, metadados de conteúdo/licença, contrato conceitual CSLE.

**Reestruturar:** Home monolítica (com muitas telas de demonstração), roteamento visitante/aluno, conteúdo ligado a eventos reais, configuração de voz e provedores, tutor LLM, modelo de perfil/consentimento, i18n e identidade visual.

**Não confundir com implementação:** componente AIChatBox reutilizável ≠ tutor ligado à API; texto “tutor ativo” ≠ autonomia; mockDecision ≠ CSLE real; exemplo de voz do navegador ≠ diálogo de voz em tempo real; login correto ≠ onboarding.

PR #14 encerrado sem merge e migração 0004 desse experimento proibida. Docs de arquitetura e nova revisão substituem sua abordagem pedagógica genérica.

## 10. Planejamento por portas de aprovação

- **Fase A — inventário/saneamento:** mapa de implementação real, riscos P0/P1, estados simulados, débitos, superfícies com dependência Manus, auditoria de dados, segurança e governança. Nenhuma feature.
- **Fase B — experiência de primeiro contato:** protótipo de UX e contrato dos eventos reais; só implementar após aprovação de especificações.
- **Fase C — tutor proativo:** orquestrador, memória, voz, fornecedores, limites de custo, consentimento, fluxo de conversas e avaliação de qualidade. Especificar primeiro.
- **Fase D — conteúdos e fluxo pedagógico real:** currículo versionado, avaliações amplas, input, output, SRS, feedback; integração do CSLE permanece desativada.
- **Fase E — validação CSLE:** adaptador e testes isolados de autorização, replay, auditoria, determinismo/limites e avaliação com o Deep antes do acoplamento.
- **Fase F — comercialização:** internacionalização de conteúdo, segurança operacional, monitoramento, publicação Android e compliance, testes de escala.

**Portão obrigatório para qualquer código novo:** fundador + Deep aprovam PRODUCT-VISION, TUTOR-SPEC e ONBOARDING-SPEC por versão. Nenhum deploy, migration ou mudança no CSLE durante revisão.

## 11. Referências de pesquisa e limites

- OpenAI voice agents: https://developers.openai.com/api/docs/guides/voice-agents
- OpenAI realtime/WebRTC: https://developers.openai.com/api/docs/guides/realtime
- Recuperação espaçada: https://www.retrievalpractice.org/faq

Documentos complementares: TUTOR-SPEC.md, ONBOARDING-SPEC.md e FASE-A-INVENTARIO.md.
