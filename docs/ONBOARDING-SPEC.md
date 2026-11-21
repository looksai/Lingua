# Lingua — Especificação do Primeiro Acesso e Diagnóstico

**Versão:** proposta 0.1 | **Data:** 21/11/2026 | **Status:** **PARA APROVAÇÃO — nenhuma feature ou migration autorizada**
**Auditoria:** fundador + Deep antes de qualquer implementação. Conexão real com CSLE fora do escopo.

## 1. Objetivo do primeiro contato

Receber três pessoas sem privilegiar artificialmente uma só:
1. **Curioso sem objetivo:** entrou «de bobeira» e precisa descobrir valor rapidamente;
2. **Aprendiz motivado:** quer começar a aprender sem formulários intermináveis;
3. **Aprendiz experiente:** quer diagnóstico respeitável, reconhecimento de conhecimentos já demonstrados e percurso não infantilizante.

A promessa é uma **primeira experiência de aprendizagem personalizada, curta e verdadeira**, que faça o estudante entender o próximo passo e tenha alternativa de aprofundamento. Encantar não equivale a usar dados inventados, declarações falsas do CSLE ou gamificação compulsiva.

## 2. Regras de navegação e identidade

```text
VISITANTE
  ├─ Landing → Demonstração explicitamente rotulada, sem progresso oficial
  ├─ Criar conta → confirmação da sessão → Perfil inicial
  └─ Entrar → autenticado
AUTENTICADO
  ├─ perfil incompleto → retomada da última etapa válida
  ├─ perfil completo + diagnóstico não iniciado → convite ao diagnóstico
  ├─ diagnóstico em andamento → retomar/adiar com estado persistido
  ├─ diagnóstico concluído → plano inicial explicável → Dashboard real
  └─ aluno recorrente → Dashboard real (nunca Home com Welma)
```

Autenticação não pode mostrar o shell de visitante por erro de rota. Landing e demo permanecem isolados da base de evidências, do progresso oficial e de qualquer conta. Demonstrar inteligência futura é permitido **somente com marcação de simulação** e sem dados pessoais reais.

`onboardingState` proposto: `new_account | profile | tutor_preferences | language_preferences | diagnostic_offer | diagnostic_in_progress | plan_review | completed | deferred`. Cada passo tem `status, updatedAt, version, userId`. Operações devem ser idempotentes e isoladas por conta. O botão Voltar não deve duplicar respostas ou reiniciar avaliações sem querer.

## 3. Sequência de telas proposta

### Tela 0 — Landing pública (sem autenticação)
**Objetivo:** comunicar em linguagem humana: «Você escolhe o que quer explorar. Seu tutor ajuda você a aprender e entender por quê». CTA principal «Experimentar agora»; CTA alternativo «Já tenho conta».

Pode existir microdemonstração de uma interação curta e fictícia, explicitamente rotulada como demonstração. **Não** atribuir notas, perfil cognitivo, progresso, feedback de pronúncia ou ações CSLE reais.

### Tela 1 — Cadastro/login
Usar base de autenticação própria existente somente após QA de sessão, recuperação, verificação de email, proteção antifraude e isolamento. Dados pessoais mínimos. Voltar do login não deve expor dashboard de outro usuário ou reutilizar memória de conta anterior.

### Tela 2 — Boas-vindas e interesse opcional
Em vez de pedir longo perfil: «O que trouxe você aqui hoje?» com opções simples **«Aprender por curiosidade», «Trabalho/estudos», «Viagem/conversa», «Ainda não sei»** e resposta livre opcional. Interesse não determina currículo nem finge diagnóstico.

**Obrigatórios mínimos:** nenhuma profissão, renda ou dado sensível. Opção «pular» visível. Personalização por interesses só após consentimento pertinente.

### Tela 3 — Escolha de idiomas
Três campos **distintos**:
- `interfaceLocale`: idioma da UI, por exemplo `pt-BR`;
- `nativeLanguage`: idioma no qual o estudante prefere explicações, por exemplo `pt`;
- `targetLanguage`: idioma aprendido, por exemplo `en`.

Eles podem diferir; não inferir um do outro. Se somente pt-BR→en estiver habilitado na primeira entrega, mostrar restrições reais e opções futuras **sem sugerir que já estão disponíveis**. Validar combinação suportada, troca futura com separação de progresso por trilha e versões de currículo.

### Tela 4 — Nome e estilo do tutor
Texto: «Como você quer chamar seu tutor?» com entrada livre opcional; padrão neutro «Seu tutor». Escolher personalidade inicial (acolhedor, objetivo, descontraído, neutro) e, se existir provedor de voz habilitado, voz e velocidade. Mostrar «Você pode mudar isso depois».

Validar tamanho, segurança de exibição e nomes ofensivos no contexto da conversa, sem censurar nomes benignos. Nunca obrigar gênero ou «idade» fictícia do tutor. O tutor se apresenta **com o nome escolhido**, na língua de apoio, e pergunta se pode iniciar a primeira atividade.

### Tela 5 — Consentimento e opções de áudio/memória
Microfone **desligado até toque expresso**. Texto é funcional por padrão. Oferecer, em momentos relevantes, permissões separadas para: envio/transcrição de áudio, memória pedagógica opcional, personalização por interesses, estudo de pesquisa, treinamento/compartilhamento de dados quando legalmente pertinente.

Não condicionar aprendizagem básica a consentimento para treinamento de IA, uso secundário de dados ou armazenamento indefinido de voz. Exibir provedores externos/categorias de transferência e política de retenção em linguagem clara. Suporte à revogação posterior.

### Tela 6 — Primeiro diálogo útil e convite ao diagnóstico
Tutor: «Posso descobrir o que você já consegue fazer e montar um começo adequado? Você também pode experimentar uma atividade primeiro». Dar duas rotas:
- **Experimentar antes:** microatividade significativa sem nota de proficiência, registrando somente o que o estudante autorizou;
- **Avaliar meu ponto de partida:** diagnóstico progressivo adaptativo.

O curioso encontra uma pequena vitória antes de preencher um teste extenso. O dedicado segue direto para avaliação. O aluno pode parar, retomar e alterar objetivos.

### Tela 7 — Diagnóstico conversacional adaptativo
Avaliação por **competências e habilidades**, não por seis alternativas genéricas. Domínios:
- compreensão escrita: ler e responder ao sentido, inferência, não só reconhecimento de palavras;
- compreensão auditiva: escutar áudio real e mostrar compreensão; sem exibir transcrição antes da tentativa quando a tarefa mede escuta;
- produção escrita: construir resposta livre em contexto, com rubrica;
- produção oral: diálogo/gravação opcional, com rubrica prudente e evidência de assistência; ASR sozinho não prova pronúncia.

**Sequência:** verificar autoavaliação opcional, começar com uma tarefa acessível, variar dificuldade conforme evidência, testar requisito anterior ou próximo, finalizar quando houver material suficiente para plano **provisório**. Não usar longa bateria fixa como condição para entrar no app.

**Regras de robustez:** cada habilidade recebe `observed | partially_observed | not_assessed`, confiança calibrada e tarefas associadas. Falta de microfone significa **fala não avaliada**, nunca «nível ruim»; problema auditivo pode mudar modalidade sem inventar resultado. O aluno pode contestar, refazer ou pedir verificação adicional.

**Assistência e validade:** registrar se houve dica, tradução, repetição, correção ou consulta; a mesma resposta não pode contar como autonomia depois de fornecida a solução. Separar teste de prática; durante diagnóstico, ajuda oferecida deve ser registrada e reduzir a força inferencial da observação.

**Proteção contra pontuação fictícia:** nenhuma porcentagem, nota CEFR ou declaração «fluente» gerada só pelo LLM; níveis CEFR só podem ser apresentados como estimativas de habilidade fundamentadas em rubricas, amostra suficiente e validação pedagógica. Sem isso, usar descritivos: «consegue se apresentar», «ainda não avaliei a compreensão auditiva».

### Tela 8 — Plano inicial explicável
Mostrar:
- **o que foi observado**: habilidade, tarefa, evidência, assistência, data e confiança;
- **o que falta verificar**: voz não testada, escuta inconclusiva etc.;
- **objetivo curricular** e próximo passo com razão compreensível;
- **escolha controlada** entre dois caminhos de contexto para praticar a mesma competência;
- **próxima revisão** SRS, apenas quando existirem itens reais com agendamento.

Exemplo: «Você entendeu a mensagem de apresentação escrita, mas ainda não conversou por voz. Vamos praticar perguntas simples sobre viagem ou tecnologia?». Não exibir «o CSLE calculou» antes da integração real.

O plano é versionado, revisável e **não certificador**. O estudante pode mudar metas e contexto sem apagar as competências centrais.

### Tela 9 — Dashboard pessoal autêntico
Carregar **exclusivamente dados do usuário**. Primeira entrada sem evidência mostra estado zero real e um caminho para primeira ação. Blocos recomendados: «Continuar conversa», «Treinar agora», «Revisar quando houver itens», «Ler/ouvir», «Meu percurso», «Configurar tutor» e «Privacidade».

Não reproduzir Welma, gráfico de progresso falso ou sessões de demonstração. O tutor fica disponível como presença discreta, com iniciativa respeitando `InterventionPolicy`; não deve bloquear a navegação.

## 4. Máquina de estados, falhas e retomada

- **Conta autenticada mas perfil vazio:** só telas de onboarding; nunca dashboard fictício.
- **Aluno sem diagnóstico:** permite começar tarefas com plano inicial exploratório, rotulado «provisório»; não inventar classificação.
- **Diagnóstico pausado:** persistir checkpoint das tarefas autorizadas; retomar em dispositivo novo sem duplicar itens ou alterar avaliação silenciosamente.
- **Perda de conexão:** usar práticas offline já verificadas; avaliação remota pendente não vira conclusão oficial; apresentar retomada honesta.
- **Áudio recusado/indisponível:** oferecer texto e áudio de referência quando cabível; distinguir habilidades não avaliadas.
- **Troca de aparelho e sessão:** estado por userId; sem mistura de Demo, conta A e conta B.
- **Alteração posterior de idiomas:** novo percurso por `targetLanguage`, preservar histórico auditável por idioma; não reutilizar estimativas de nível entre idiomas.
- **LLM indisponível:** não travar leitura/SRS/shadowing; oferecer diagnóstico manual/assíncrono somente se desenhado e validado, sem fingir conversa.
- **Exclusão/revogação:** cancelar áudio e propostas pendentes, aplicar política de exclusão, preservar apenas o que exigência legítima autorizar com transparência.

## 5. Diagnóstico: rubricas e evidência

Cada `DiagnosticTask` precisa de:
`taskId, version, targetLanguage, domain, curriculumCompetencyIds, prerequisites, inputAssetId, difficultyBand, expectedEvidence, rubricId, accessibilityVariants, licensingRef`.

Cada `DiagnosticAttempt` precisa de:
`userId, taskId, attemptId, timestamp, modality, responseRef, hintsUsed, translationsUsed, retries, assistanceLevel, scorerVersion, outcome, confidence, uncertaintyReason, studentReviewStatus`.

**Separar avaliação por LLM da decisão oficial:** um avaliador pode sugerir anotações conforme rubrica, mas o serviço do Lingua valida o registro; decisão de «domínio» exige critérios próprios e evidências independentes suficientes. Rubricas precisam de checagem de consistência e revisão por humanos antes de uso comercial.

**Evitar falsas métricas:** duração e pausas do shadowing não medem fonemas, inteligibilidade ou fluência. ASR pode errar sotaques; usar como ferramenta auxiliar e expor incerteza, não punição automática.

## 6. Microvitória pedagógica e primeiro encantamento

**Cenário do curioso:** seleciona tema «música», nomeia tutor «Nina», escolhe texto. O tutor mostra uma microfrase no idioma alvo, a pessoa tenta responder a uma pergunta contextual, recebe feedback específico e tem a chance de tentar de novo. Ao terminar, vê «você conseguiu reconhecer X nesta atividade» — apenas se verificado — e uma escolha de próxima prática. Se não houver login ainda, fica em demo claramente rotulada e **não** cria histórico oficial.

**Cenário do aluno experiente:** informa que já estuda, escolhe avaliação, demonstra compreensão e produção; o sistema apresenta as **habilidades observadas e lacunas**, não o obriga a «Hello, my name is...» nem lhe concede B2 sem medida.

**Cenário sem microfone:** estudante usa texto e leitura; competência oral fica «não avaliada», sem penalização invisível.

## 7. Premissas do produto versus código atual

Elementos a preservar depois de QA: autenticação independente, Aiven, laboratório de leitura, shadowing local, SRS e regras de idempotência. Status de cada um deve ser comprovado em staging e inventário Fase A antes de chamar «pronto».

`Home.tsx` exibe Welma/progresso demonstrativo no estado auditado. A rota para usuário autenticado deve ser redesenhada, mas **não alterar `Home.tsx` agora**.

PR #14 foi encerrado em 21/11/2026 **sem merge**. Não aplicar `drizzle/0004` nem aproveitar diretamente lições genéricas como diagnóstico definitivo. Qualquer futura migration deve seguir contrato de dados aprovado e testes.

## 8. Critérios de aceite futuros

1. Visitante, demo e autenticado têm sessões e dados separados; novo usuário não vê Welma nem percentuais falsos.
2. Nome do tutor escolhido pelo aluno, personalizável e preservado entre dispositivos.
3. `interfaceLocale`, `nativeLanguage`, `targetLanguage` são independentes em UI, APIs e armazenamento.
4. Experiência por texto funciona sem microfone, câmera, voz paga ou CSLE.
5. Diagnóstico abrange compreensão e produção, com escuta/fala explicitamente não avaliadas se ausentes.
6. Evidência guarda rubrica, versão, assistência, proveniência e incerteza; avaliação/LLM não certifica.
7. Primeiro plano explica por que a tarefa foi escolhida e pode ser ajustado.
8. Retomada segura, sem duplicidade de resultado, vazamento entre contas ou gravação oculta.
9. Leitura, shadowing e SRS mantêm suas capacidades reais e não alegam medir o que não medem.
10. A usabilidade é testada com iniciantes, curiosos, experientes, usuários de tecnologia modesta e opções de acessibilidade.

## 9. Matriz de testes mínimos para futura implementação

**Autenticação:** visitante→registro; logout/login; duas contas no mesmo navegador; abas simultâneas; login em outro aparelho; exclusão de conta.

**Idioma:** pt-BR UI + PT apoio + EN alvo; interface diferente do nativo; idioma alvo futuro indisponível; troca de idioma depois de diagnóstico.

**Tutor:** renomear; mudar tom; silenciar; recusar sugestão; ausência de memória; transcrição corrigida; falha de API.

**Diagnóstico:** iniciante real; aluno avançado; resposta vazia; ajuda durante tentativa; microfone negado; ASR errado; pausa/repetição; score inconclusivo; conexão interrompida.

**Integridade:** mock/demo nunca aparece como evidência; usuário A nunca vê dados de B; duplicatas de submissão; CV/CSLE mock jamais apresentado como motor ativo.

**Acessibilidade:** teclado, leitores de tela, contraste, legendas, controle de velocidade, alternativa ao áudio e textos compreensíveis.

## 10. Dependências e decisão para aprovação

Aprovação antes de codar:
- definição de currículo e rubricas iniciais pt-BR→en;
- qual conjunto mínimo do diagnóstico será validado em testes humanos;
- textos de consentimento e retenção;
- quais opções de personalidade/voz estarão no primeiro lançamento;
- política de custos, latência e quotas do tutor;
- critérios técnicos para separar landing/demo/aluno;
- confirmação do inventário Fase A.

**Não implementar agora:** telas, rotas, dados, migrations, tutor em produção, APIs de voz ou bridge CSLE. Este arquivo descreve **experiência desejada**, não funcionalidade existente.

**Relacionados:** [Visão do produto](./PRODUCT-VISION.md), [Tutor](./TUTOR-SPEC.md), [SRS](./srs-spec.md), [Shadowing](./shadowing-spec.md), [Offline](./offline-sync-spec.md).
