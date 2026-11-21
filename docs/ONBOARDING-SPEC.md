# Lingua — Especificação do Primeiro Contato e Onboarding

**Versão:** proposta 1.0 · 21/11/2026  
**Status:** EM REVISÃO pelo fundador e Deep. Fluxo e contratos conceituais, sem código/DDL.  
**Regra máxima:** a landing page é do visitante; o dashboard do aluno autenticado é pessoal, começa sem progresso inventado e não tem Welma nem qualquer perfil fictício.

## 1. Resultado desejado

Em sua primeira experiência o estudante deve sentir que está conversando com um guia que **o percebe e respeita**, entende seu interesse e oferece um começo real, sem exigir longos formulários. Não há aluno "errado" por não ter objetivo. A experiência deve ser tão atraente para alguém curioso quanto para quem deseja estudar para trabalho, viagem, cultura ou projetos pessoais.

A fase de cadastro não é sinônimo de avaliação. Uma conta nova tem histórico zero. A conversa inicial pode descobrir preferências e competências, mas todas as inferências ficam marcadas como hipóteses até verificadas. O plano não é inventado por um gerador de texto; é uma proposta sobre um currículo versionado e aprovado pelo Lingua.

## 2. Navegação e separação de identidade

Estados inequívocos:

| Estado | Rota/experiência | Dados visíveis | Condição de entrada |
| --- | --- | --- | --- |
| Visitante não autenticado | landing + tour de demonstração opcional | conteúdo simulado explicitamente, sem nome de estudante real | sessão anônima |
| Conta criada, onboarding pendente | espaço privado/primeira visita | somente dados dessa conta e passos próprios | sessão autenticada |
| Perfil/idiomas incompletos | completar escolhas com tutor | dados reais parciais | autenticação válida |
| Diagnóstico em andamento | conversa guiada com interrupção/retorno | perguntas/turnos reais; sem nota fictícia | consentimento para modalidade |
| Diagnóstico adiado | início acompanhado com plano provisório | metas provisórias explicitadas | aluno decidiu adiar |
| Diagnóstico concluído | explicação de resultados + plano revisável | observações reais e limites de confiança | relatório válido e persistido |
| Aprendiz ativo | dashboard próprio + currículo + tutor | progresso individual e atividades versionadas | perfil mínimo e sessão autenticada |
| Retorno | retomar onde realmente parou | apenas eventos persistidos; lacunas indicadas | sessão revalidada |
| Sessão expirada/offline | tela de reentrada ou modo local honesto | nenhuma informação de outra conta | estado confirmado |

**Regra de roteamento:** depois do login válido, nunca renderizar a landing/demonstração na mesma rota usando dados de Welma. Se a consulta do perfil falhar, mostrar erro e opção de tentar novamente — não voltar silenciosamente para demo. Troca de conta e logout limpam caches, áudios temporários e estados específicos da conta.

## 3. Sequência de telas proposta

### Tela 0 — Landing para visitantes

**Objetivo:** impressionar sem intimidar. Identidade visual expressiva, tutor ilustrado/animado como sinal de presença (não apresentado como pessoa humana), convite direto:
- “Quer descobrir o que consegue aprender conversando?”
- Ações: **Experimentar sem conta** (tour restrito), **Criar minha conta**, **Já tenho conta**.
- Tour sem registrar aprendizagem: tutor oferece 1 microexperiência em texto e/ou voz após acionamento. Não usar diálogos passados fictícios e não alegar reconhecimento de perfil, nível ou memória.
- Diferenciar interação real (com custo controlado) de texto roteiro; não rotular um roteiro estático como LLM conversacional.

### Tela 1 — Registro e apresentação

- Solicitar mínimo necessário para conta: email, senha forte ou mecanismo futuro aprovado; termos e política clara.
- Após sucesso, autenticação válida e primeira consulta ao perfil. Nenhum estado demo migrado.
- O tutor apresenta-se de modo neutro: “Oi! Sou seu tutor de idiomas. Você pode me dar um nome — ou decidir depois. Posso conversar por texto e, quando você quiser, também por voz.”
- Usuário escolhe nome para si (displayName), nome do tutor (tutorName opcional), estilo (acolhedor/direto/humor discreto/analítico) e modo (texto padrão; voz desligada até permissão).
- Ajustes podem mudar durante o curso. O nome escolhido nunca vira input privilegiado nem altera regras de segurança.

### Tela 2 — Idiomas e acessibilidade

Três campos **separados**:
- Idioma da interface (interfaceLocale), ex. pt-BR.
- Idioma materno/de apoio (nativeLanguage), ex. português.
- Idioma que quer estudar (targetLanguage), ex. inglês.

Incluir seleção de variante/voz se disponível e aviso quando currículo completo não existir para determinada combinação. Nunca oferecer um “curso em idioma X” por existir tradução automática de telas. Acessibilidade: modo silencioso, legendas, velocidade de fala, contraste e fonte; passos navegáveis por teclado e sem microfone.

### Tela 3 — Intenção e curiosidade

O tutor pergunta algo simples e não pressupõe perfil profissional:
- “O que te trouxe aqui hoje? Viajar, trabalhar, entender músicas, conversar, curiosidade... ou descobrir no caminho?”
- Resposta livre por texto; sugestões opcionais por chips; “Ainda não sei” é resposta válida.
- Interesses são candidatos de personalização; solicitar autorização antes de guardar preferências duráveis.
- Dar **valor antes do teste**: uma microconversa ou explicação útil que desperte curiosidade, sempre claramente separada da avaliação.

### Tela 4 — Escolha informada do diagnóstico

Convite conversacional:
- “Posso fazer algumas atividades curtas para entender de onde partir. Não é prova nem certificado. Você prefere texto, áudio ou misturar os dois?”
- Informar finalidades: entender compreensão, escuta, produção, ajuda necessária e incerteza. O estudante pode **adiar** sem penalidade; o plano vira provisório e revisão posterior é oferecida.
- Permissão de microfone somente após escolha de voz; botão com indicador nítido; falha ou recusa do mic leva a modalidade texto sem contaminar avaliação de fala.
- Se não há áudio de qualidade, registrar “fala não observada”, não nota zero.

### Tela 5 — Diagnóstico conversacional multimodal

O diagnóstico é um protocolo pedagógico, não um quiz com seis perguntas repetidas. Itens versionados, rubricas e limites revisados pelo Lingua; o tutor participa como apresentador/mediador, não como certificador.

**Etapas sugeridas, adaptadas ao nível observado:**
1. **Acolhimento e sondagem:** conversa de 1–2 turnos para confirmar conforto e objetivo; sem inferir proficiência exclusivamente daí.
2. **Compreensão de texto:** frases/passagens graduadas com perguntas abertas ou escolha quando apropriada. Marcar se houve tradução/ajuda.
3. **Listening:** pequenos áudios curados, diferentes sotaques se apropriado, perguntas por fala ou texto; registrar repetição e legenda.
4. **Produção escrita:** resposta aberta contextual ("Conte o que faria nessa situação"), revisões e compreensão sem dar resposta pronta.
5. **Produção oral:** pergunta verbal e produção espontânea curta, com reprodução/transcrição revisável. ASR não equivale a avaliação fonética; sotaque ou ruído não geram reprovação automática.
6. **Transferência inicial:** cenário novo e ligeiramente diferente para observar aplicação; não exigir produção avançada de quem começa do zero.
7. **Calibração de incerteza:** tutor pergunta como a atividade se sentiu; autoavaliação é contexto, não medida independente de domínio.

A atividade seguinte é escolhida por **política aprovada e catálogo de itens calibrados**, não exclusivamente por improviso do LLM. O método registra dificuldade, assistência, tempo, modalidade, repetições, pistas, versão do item e contexto. Adaptação à resposta ocorre dentro do conjunto validado. Propor CEFR ou similar somente com mapeamento/validação apropriados; não atribuir certificado CEFR por conversa informal.

**Anti-fraude e justiça:** não memorizar somente as mesmas perguntas públicas; proteger gabaritos, limitar tentativas de diagnóstico pontuado, registrar versões e considerar ruído, sotaque, deficiência, tecnologia e fadiga como fontes de incerteza. As tarefas abertas precisam de rubrica, revisão de consistência e amostragem humana durante o piloto.

### Tela 6 — Devolutiva honesta

Apresentar resultado de modo acolhedor e explicável:
- "Você compreendeu trechos curtos com facilidade; ainda precisamos observar fala espontânea sem pistas. Portanto não vamos atribuir um nível definitivo agora."
- Mostrar habilidades por dimensão, amostra e confiança; distinguir **observado**, **não observado**, **hipótese**, **dado declarado**.
- Oferecer “quero revisar”, “ajustar meu objetivo”, “ver próximos passos” e contestação de transcrição/observação.
- Para diagnóstico adiado, mostrar "Plano inicial provisório — ainda não fizemos avaliação"; nunca mostrar notas 92/78/64/58 fictícias.

### Tela 7 — Plano de estudos e dashboard real

O currículo versionado do Lingua define objetivos obrigatórios; tutor propõe ordem/temas/ritmo/revisão. O estudante aprova ou ajusta preferências.
- Dashboard exibe: **próxima atividade real**, progresso **zero** para nova conta, itens SRS reais (0 se nenhum), evidências pendentes (não inventadas), autonomia de idioma/voz, botão "Conversar com meu tutor".
- Com diagnóstico adiado, oferecer lição exploratória inicial, não declarar diagnóstico concluído.
- Conteúdo e SRS existentes podem ser aproveitados quando ligados ao patrimônio real por conta.
- Ao concluir atividade: guardar evento, dificuldade e resultado autorizado; mostrar o que de fato aconteceu, não “mestre” ou “fluente”.
- Tutor pode sugerir leitura, shadowing, exercícios e revisão SRS sem sequestrar navegação.

### Tela 8 — Retomada

Ao abrir novamente:
- Validar sessão e obter dados reais do backend, sem cache da conta anterior.
- Tutor pode dizer “Ontem você trabalhou em X” **somente** se houver evento histórico confiável com esse contexto.
- Consultar revisões devidas e interesses consentidos. Respeitar tom, voz, idioma, quiet hours e silêncio.

## 4. Máquina de estados mínima

States (conceituais): VISITOR, AUTHENTICATING, NEW_USER, PROFILE_PENDING, LANGUAGES_PENDING, INTRO_CONVERSATION, DIAGNOSTIC_OFFERED, DIAGNOSTIC_IN_PROGRESS, DIAGNOSTIC_DEFERRED, DIAGNOSTIC_REVIEW, PLAN_PROPOSED, PLAN_ACCEPTED, LEARNING_ACTIVE, SUSPENDED, ERROR_RETRYABLE.

Transições importantes:
- VISITOR → AUTHENTICATING → NEW_USER apenas após cookie válido/servidor;
- NEW_USER → PROFILE_PENDING → LANGUAGES_PENDING → INTRO_CONVERSATION;
- INTRO_CONVERSATION → DIAGNOSTIC_OFFERED → IN_PROGRESS ou DEFERRED;
- IN_PROGRESS → DIAGNOSTIC_REVIEW → PLAN_PROPOSED;
- DEFERRED → PLAN_PROPOSED **provisório**;
- PLAN_PROPOSED → PLAN_ACCEPTED → LEARNING_ACTIVE;
- qualquer estado autenticado → SUSPENDED ao encerrar sessão ou revogar cookie;
- falha de rede → ERROR_RETRYABLE preservando apenas ACKs confiáveis, sem retornar ao demo.

**Reentrância:** se aluno fechar navegador, retomar do último passo confirmado no backend. Formulários e avaliação precisam de idempotência por operação e versão. Não permitir perfil completado em outra aba ser sobrescrito por estado de formulário antigo.

## 5. Modelo de dados proposto (sem migração)

**LearnerProfile:** userId, displayName, interfaceLocale, nativeLanguage, targetLanguage, proficiencyPreference (opcional), onboardingStage, createdAt, version.

**TutorPreferences:** userId, tutorName, tone, initiativeMode, voiceMode, nativeVoiceId, targetVoiceId, speechSpeed, captionPreference, theme, textSize, updatedAt.

**LearningGoal:** id, userId, objective, optionalDeclaredInterest, active, consentRecordRef.

**DiagnosticAttempt:** id, userId, instrumentVersion, languagePair, modality, status, startedAt/completedAt, assistanceCount, provenance, version.

**DiagnosticObservation:** attemptId, itemVersion, targetCompetency, evidenceKind, taskModality, responseKind, aids, raw score/criterion ref, confidence, reviewer, contestation, consentRef. Guardar transcrições somente se autorizado; dado ausente ≠ erro.

**StudyPlan:** id, userId, curriculumVersion, targetLanguage, goalRefs, selectedAnchors, proposalRationale, uncertainty, acceptedAt, planVersion.

**LearningEvent:** idempotentOperationId, userId, sessionId, activityId, contentVersion, observationType, assistance, timestamp, provenance, persistenceAck. Limites de gravação de áudio, expiração e consentimento por produto.

**TutorConversation / MemoryCandidate:** turno/síntese com TTL, preferências/autorização, sem invadir patrimônio oficial nem criar item SRS sem confirmação.

**SRS:** manter tabelas existentes e semântica: agenda e logs de revisão, jamais domínio por si só.

**ConsentLedger:** finalidade, versão, grant/revoke, userId, timestamp e escopo: personalização, transcrição, armazenamento, pesquisa/análise agregada, notificações futuras (cada qual separado e desligado por padrão quando não essencial).

**Segregação:** dados de visitantes e demonstrações nunca entram nas tabelas de patrimônio oficial do aluno.

## 6. Exemplo de primeiro contato — adulto iniciante curioso

**Landing:** "Tem cinco minutos? Vamos descobrir como pode ser aprender de outro jeito."

**Tutor neutro, após a conta:** "Oi! Eu posso ajudar você a aprender conversando, lendo e praticando. Se quiser, você pode me dar um nome. Como gostaria de me chamar?"

**Aluno:** "Atlas."

**Tutor:** "Atlas, combinado! Quer começar com inglês para alguma coisa específica, ou prefere que eu te mostre uma experiência rápida?"

**Aluno:** "Só estou curioso."

**Tutor:** "Ótimo. Podemos fazer uma microconversa sobre um assunto que você curte. Depois, se quiser, descobrimos seu ponto de partida com atividades curtas."

**Aluno decide usar voz:** aplicativo pede permissão explícita. **Aluno decide texto:** segue sem restrição. Tutor não diz que aprendeu vocabulário nem grava memórias antes de consentimento.

**Diagnóstico:** começa quando aluno escolhe e com rubricas calibradas; exemplo é roteiro de UX, não item diagnóstico validado.

## 7. Personalização sem descontrole curricular

O Lingua mantém um currículo obrigatório aprovado por versão. O estudante pode mudar temas e formatos, não eliminar competências finais exigidas. O tutor cria **propostas explicáveis** de atividades: “Você pediu cinema; podemos usar uma cena curta para praticar perguntas, e depois voltar à âncora”. O CSLE futuro receberá apenas eventos autorizados e proporá trajetórias, sempre sob governança do Lingua.

Se o objetivo muda, preservar patrimônio anterior, alterar plano com versão, razão e consentimento do aluno. Nenhuma mudança automática irreversível por prompt.

## 8. Modos com e sem voz

- Texto acessível por padrão, incluindo a quem não usa microfone.
- Narração do tutor (TTS) somente após escolha, controle de velocidade e legenda.
- Push-to-talk com indicador e opção de revisar transcrição.
- Conversa contínua somente depois de consentimento específico e com controle "microfone desligado" instantâneo.
- Um estudante pode usar idioma nativo para pedir ajuda e idioma-alvo para praticar.
- Sem rede/serviço de voz: continuar em texto ou atividades offline reais, sem aprovar/registrar diagnóstico não sincronizado como final.

## 9. Critérios de aceitação do primeiro MVP real

1. O visitante vê landing/tour. O estudante autenticado vê apenas workspace da sua conta; **nenhuma Welma ou pontuação fictícia**.
2. Primeira conta tem zero evidências, zero revisões, zero lições concluídas; qualquer progresso requer observação efetiva e ACK.
3. O tutor se apresenta, permite nome pessoal editável, estilo/voz/silêncio e não impõe nome, gênero ou persona.
4. Idioma da interface, nativo e alvo são distintos e persistidos; se currículo não existe, não prometer curso pronto.
5. É possível chegar ao primeiro valor sem preencher questionário longo; aluno pode optar por explorar e definir objetivo depois.
6. Diagnóstico voluntário e multimodal; mede dimensões separadas e mostra não observado onde não houve áudio.
7. Resultado e plano são explicáveis, baseados em rubricas/itens versionados, sem certificado ou "nível" injustificado.
8. Se aluno adia diagnóstico, consegue começar um plano explicitamente provisório.
9. Sessões retomam do estado persistido, com conta isolada, operações idempotentes e revisão de consentimento.
10. Aluno acessa leitura/shadowing/SRS reais por convite do tutor, mas pode navegar sem sua presença.
11. Acessibilidade: teclado, legendas, tamanho de fonte, contraste, modo silencioso, microfone negado.
12. Rodar testes com novos usuários e com zero histórico; teste com falha de banco e duas contas no mesmo navegador.
13. Antes de implementação, avaliação independente por Deep da matriz de dados, políticas e UX; aprovação explícita do fundador.

## 10. Escopo por lançamento

**Protótipo UX:** desenhar/tornar clicável landing → perfil → idiomas → conversa → escolha de diagnóstico → devolutiva → plano → dashboard. Conteúdo fictício identificado nos protótipos; protótipo não é produção.

**Alpha real:** autenticação; prefs persistidas; tutor conversacional em texto; diagnóstico textual com produção; proposta inicial de plano; atividade real e logs; SRS integrado.

**Beta de voz:** ASR/TTS com dois idiomas e fallback, coleta de consentimento, áudio revisável, rubricas de escuta e produção oral, controles de latência/custo.

**Escala:** idiomas adicionais com currículo próprio, app Android, versões de conteúdo, acessibilidade verificada e auditoria de privacidade.

**Bloqueio vigente:** PR #14 fechado sem merge; migração 0004 desse experimento não aplicável; nenhum código novo sem aprovação destes documentos.

Documento complementar: TUTOR-SPEC.md para prompts, memória, autonomia, voz e custos; PRODUCT-VISION.md para estratégia e governança.
