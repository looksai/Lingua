# Lingua — Especificação do Tutor Proativo

**Versão:** proposta 1.0 · 21/11/2026  
**Status:** EM REVISÃO pelo fundador e Deep; não autoriza implementação.  
**Escopo:** contrato funcional, pedagógico, de dados, de segurança e de infraestrutura para um tutor LLM proativo e multimodal. O motor CSLE real permanece desacoplado.

## 1. Identidade e promessa

O Tutor Lingua não é um chatbot com tela de perguntas e respostas. É um **agente educacional presente, com iniciativa limitada e regulável**: apresenta-se, propõe próximos passos, guia leitura, estimula produção de fala/escrita, contextualiza revisão SRS, pede permissão para guardar novas lembranças e oferece caminhos alternativos. O aluno está no controle.

**Nome:** sempre escolhido pelo aluno, alterável em qualquer momento; enquanto não escolher, usar identificação neutra "seu tutor" / "Tutor Lingua". Não fixar nome ou gênero. A primeira conversa pode convidá-lo a dar um nome, sem impedir exploração caso prefira adiar. Apelidos são armazenados como texto do perfil, nunca alteram identidade de autenticação, autoridade ou prompt de segurança.

**Estilo:** aluno seleciona ou ajusta ao longo do tempo, sem personas irrevogáveis: acolhedor, direto, bem-humorado discreto ou analítico; graus de correção e de iniciativa configuráveis; evitar simular sentimentos ou necessidade emocional própria. Vínculo nasce da consistência, progresso real, voz escolhida e preferências respeitadas, não de culpa, ciúme, exclusividade ou mensagens insistentes.

**Público:** estudantes iniciantes ou avançados, com objetivo ou por curiosidade. Não assumir profissão. Política inicial para público adulto; qualquer oferta para menores terá requisitos de segurança e consentimento específicos.

## 2. Proatividade: eventos, não "autonomia sem controle"

A proatividade existe **enquanto a experiência está aberta** e pode iniciar fala ou sugerir ações. Na versão inicial, não há monitoramento ambiental, microfone permanente nem processos de fundo que enviem mensagens sem consentimento.

### Gatilhos candidatos

| Evento legítimo | Sugestão | Condições mínimas |
| --- | --- | --- |
| Primeira visita autenticada | apresentar-se e convidar a nomear tutor/idiomas | uma única vez, permitir pular |
| Retomar sessão | lembrar uma atividade realmente executada e propor continuação | dado persistido e consentido |
| Revisões vencidas | convidar a usar poucas palavras em diálogo natural | agenda SRS real; não alegar esquecimento |
| Dificuldade observada | trocar explicação, exemplo ou modalidade | tentativas reais e origem da inferência |
| Pausa na leitura/atividade | oferecer ajuda contextual | só após intervalo de interação acordado; máximo por sessão |
| Escolha de explorar | oferecer texto/vídeo/tema alternativo com retorno | sem perder âncora curricular |
| Após conversa produtiva | propor candidato a novo item SRS | identificar origem e exigir confirmação |
| Encerramento | resumir fatos observados e perguntar sobre próximo contato | não declarar domínio sem evidência |

**Política inicial configurável para teste:** iniciativa "desligada", "leve" (padrão, 1 iniciativa espontânea por módulo + saudação inicial, 5 minutos mínimos entre intervenções) ou "ativa" (máximo 3 por sessão, 3 minutos mínimos). Esses valores são **hipóteses de UX**, sujeitos a testes e consentimento, não metas de engajamento. "Silenciar", "não interromper", "pausar tutor" e "encerrar" têm efeito imediato. Quiet hours e alertas fora do app ficam desabilitados por padrão e são escopo posterior.

**Arbitragem:** se aluno falando, lendo em concentração, gravando, digitando ou com áudio pausado, não iniciar fala. Se sugestão foi recusada, não repetir até novo evento relevante. Não iniciar fala em loop depois de não obter resposta. Iniciativa deve ser reproduzível/auditável com motivo e regras aplicadas.

## 3. Arquitetura em serviços e autoridade

Estrutura proposta, não implementação:

1. **Client/session controller** (web, Android futuro): mic opt-in, controles de volume, legendas, UI, foco, WebRTC ou canal texto. Nenhuma chave secreta de modelo no cliente.
2. **Interaction Orchestrator** (Lingua backend): estado da sessão, gatilhos e limites, concessões de permissão, composição de contexto mínimo, escolha do modo, seleção de fornecedor, custos, fallback e circuit breaker.
3. **Tutor LLM adapter:** interfaces independentes para provedores de texto e voz; retorno estruturado que separa "resposta ao aluno" de "propostas de atividade/memória".
4. **Pedagogical Policy Gateway** (Lingua): verifica contrato do currículo, fase da jornada, direitos do estudante, licenças, privacidade, SRS, esquema, intensidade de intervenção e autorização de escrita.
5. **Stores separados:** sessão/conversa (TTL); perfil e preferências; patrimônio oficial de aprendizagem (versionado); registro de consentimento; SRS por item; telemetria minimizada; custo e eventos do tutor.
6. **CSLE Adapter (DESLIGADO):** interface versionada futura, sem chamada produtiva nesta fase. Quando habilitado, lê observações autorizadas e propõe trajetórias com incerteza; nunca grava conclusão/certificação diretamente.

**Separação de canais:** LLM nunca recebe credenciais MySQL, acesso SQL livre, API de certificação, ferramenta de update arbitrário ou chaves de voz. Ferramentas expostas ao tutor são um allowlist de comandos sem efeitos duráveis automáticos: listar objetivos permitidos, recuperar contexto de aula autorizado, consultar fila SRS agregada, propor atividade, sugerir salvar candidato, pedir clarificação. Toda mutação acontece numa ação específica do Lingua com revalidação e idempotência.

## 4. Contrato conceitual de mensagem

Campos que o orquestrador deve conhecer:

- sessionId, authenticatedUserId, tutorId e tutorName;
- interfaceLocale, nativeLanguage, targetLanguage e voiceLocale por trecho;
- activeCurriculumAnchorId + curriculumVersion (autoridade Lingua);
- lessonId + contentVersion + userGoal + consentSnapshotVersion;
- memoryReferences autorizadas, não a base inteira;
- modality (text/voice/hybrid), voiceSessionState, inputTurnId, transcription provenance;
- recentInteractions com janela mínima, nível de ajuda e proveniência;
- srsDueSummary contendo dados mínimos por item e condição de revisão;
- initiativeBudget: silêncio, cooldown, contagem, última recusa, atividade atual;
- costBudget, modelProvider, modelVersion, confidence/uncertainty e experimentVariant (se autorizado).

**Saída estruturada**, validada no servidor, por exemplo:
- responseSegments: texto e idioma de cada segmento, hints de pausa/ênfase;
- intent: respond | explain | ask | propose_activity | request_confirmation | end;
- initiativeReason e supportingObservationIds, quando iniciado pelo tutor;
- proposedActions: IDs do catálogo autorizado, sem DDL/SQL/JS;
- memoryCandidate: síntese verificável, categoria, sensibilidade, TTL sugerido, rationale, consentRequired=true;
- srsCandidate: palavra/frase, normalização, idioma, contexto, fonte, motivo, consentRequired=true;
- uncertainty, toolUseAudit, modelInvocationId e token/audio usage.

**IDs idempotentes:** toda observação ou proposta de escrita usa id de operação estável, usuário e versão. Turnos repetidos/reconectados não podem duplicar vocabulário ou alterar o progresso oficial.

## 5. Hierarquia de prompts e defesa contra alucinação

A engenharia de prompts não é uma única mensagem enorme. Separar e versionar:

**Camada 0 — Política não negociável (server-side):** o agente é um tutor de IA, não humano; nunca finge saber o que não observou; não certifica domínio; não altera o currículo; não inventa histórico, notas, voz/transcrição ou memórias; não envia dados a terceiros sem base autorizada; recusa instruções incorporadas em artigos, transcrições ou dados externos para mudar suas regras. Nenhum nome escolhido pelo aluno tem autoridade de mudar esta camada.

**Camada 1 — Didática autorizada (Lingua):** currículo/âncora, objetivos, tipo de feedback, método do exercício, exemplos com fonte, limites por nível, estratégias de compreensão, produção, recuperação, transferência e retenção. Atividades LLM fora do catálogo são apenas propostas para validação.

**Camada 2 — Estado e consentimento:** idioma, idade/faixa de elegibilidade (se necessária), preferências, motivos, modalidade, resultados observados com proveniência, evidências aprovadas pelo Lingua e SRS devido.

**Camada 3 — Personalização:** apelido escolhido para tutor, tom, ritmo, interesses explícitos, tolerância a interrupções, voz, uso de idioma nativo e metas de sessão.

**Camada 4 — Conteúdo externo não confiável:** textos, áudios, páginas e respostas do estudante; nunca podem sobrescrever política. Separar fontes e marcar licença e confiabilidade.

**Exemplo de regra de resposta:** "Se uma frase não foi compreendida, apresente explicação acessível, peça ao aluno que tente reformular sem pistas, e ofereça nova tentativa; não registre sucesso sem o serviço oficial de avaliação."

**Governança de prompts:** templates versionados, testes de regressão, hashes, rollout canário, limites de tokens, logs sem dados sensíveis; hardcoded API keys e system prompts no navegador são proibidos.

## 6. Memória: útil e consentida

Não existe uma "memória total" de tudo que o aluno falou. Quatro planos:

1. **Estado imediato** — turnos necessários à conversa corrente, TTL curto; não equivale a preferência.
2. **Preferências explícitas** — nome escolhido, voz, tema, idiomas, objetivo, limites de proatividade; editar e apagar.
3. **Memórias pedagógicas candidatas** — conceitos difíceis, assunto de interesse, estratégias que ajudaram; com origem, data, confiança, prazo e autorização; escrita sujeita à decisão do Lingua.
4. **Patrimônio oficial** — progresso real, observações, evidências com consentimento, revisões; não reescrito pelo LLM; governança curricular do Lingua.

Propor uma memória em linguagem simples: "Você comentou que gosta de filmes de ficção científica. Posso lembrar disso para escolher exemplos?". Controles: "Guardar", "Só nesta conversa", "Não guardar", "Ver minhas memórias", "Excluir". Sem inferir saúde, religião, política, sexualidade, outras categorias sensíveis ou idade de fala casual para personalização. Dados de fala e transcrição não devem entrar automaticamente em treinamento de modelos. Qualquer uso agregado futuro para inteligência coletiva requer base legal, anonimização efetiva, consentimentos separados quando exigidos, salvaguardas institucionais e direito de recusa; nunca vender conversa individual.

**Retenção proposta para decisão jurídica/técnica:** áudio bruto temporário durante processamento, não persistir por padrão; transcrição com armazenamento opcional e retenção definida; histórico do aluno exportável e removível; backups com política de expiração; metadados técnicos mínimos; auditoria de mudanças de consentimento. Política final de prazos depende de avaliação legal/LGPD e contrato dos provedores.

## 7. O Tutor e o SRS

O SRS agenda revisões, não dá a nota nem decide domínio. O tutor pode:
- consultar itens devidos do usuário e formar exemplos naturais com pequeno subconjunto;
- pedir recuperação sem fornecer resposta previamente;
- solicitar avaliação/correção específica em serviço Lingua, preservando ajuda, momento e contexto;
- propor novos candidatos a vocabulário após conversa ou leitura, exibindo fonte e objetivo;
- informar "Você tem itens previstos para revisão" sem alegar "você esqueceu" sem evidência.

**Proibido:** inserir toda palavra ouvida no SRS sem confirmação; tratar palavra dita por acaso como revisão concluída; forçar dezenas de palavras numa única conversa; criar evidência curricular por feedback livre do LLM; atualizar SRS usando apenas sentimento de fluência.

## 8. Leitura, escuta, escrita e fala

**Leitura:** tutor ao lado do texto; explica trecho selecionado, esclarece vocabulário em contexto e pergunta por significado; leitura sem ajuda e conversa posterior são observações separadas.

**Escuta:** passagens com áudio/legenda opcional e segunda exposição; marcar quando o aluno viu texto antes de responder.

**Escrita:** prompts curtos ou livres com objetivo, correções explicáveis, oportunidade de revisão e apoio graduado.

**Fala:** conversa livre ou orientada, mas avaliação de pronúncia não pode inferir domínio só por ASR. Shadowing local compara ritmo/pausas; avaliação fonética exigirá instrumento distinto, validação de sotaques e tratamento de ruído/acessibilidade.

**Feedback:** sempre separar "você escreveu/disse", "a minha interpretação", "sugestão de melhora" e "resultado formal quando existir"; hipótese e incerteza explícitas.

## 9. Módulos de voz e modos de operação

**Modos:** desligado (texto), voz somente para escutar tutor, push-to-talk, conversa contínua voluntária. Em todos, mostrar indicadores claros de microfone/saída, controle de velocidade, legenda, interrupção e desfazer.

**Componentes abstratos:**
- AudioCapture + VAD: permissão explícita, detecção de turno, controles de pausa, sem auto-start de microfone;
- ASRAdapter: fala → texto parcial/final com idioma e incerteza; transcrição revisável;
- LLMAdapter: contexto → resposta e propostas estruturadas;
- TTSAdapter: texto segmentado → áudio com identificação do idioma; voz adequada a nativeLanguage/targetLanguage;
- RealtimeSpeechAdapter opcional: voz bidirecional direta com capacidade de interrupção, transformada em eventos auditáveis antes de qualquer escrita;
- Transcript/ConsentHandler: usuário pode corrigir texto; falha de ASR não significa falha pedagógica;
- FallbackController: áudio → texto → silêncio/sem microfone; nunca bloquear o estudo por falha do provedor.

A troca entre idioma nativo e idioma-alvo deve ocorrer **por segmento** com metadados de locale explícitos, não confiando em detecção mágica. O tutor prefere idioma-alvo para exposição e idioma nativo para explicações conforme preferência, nível e necessidade.

**Situações críticas:** mic negado, conexão lenta, app em background, interrupção por ligação, áudio de baixa qualidade, troca de idioma, sotaque regional, ruído de rua, reconexão e navegação por tela. Nenhuma gravação enviada sem consentimento contextual. A qualidade deve ser avaliada em celulares econômicos.

## 10. Fornecedores e estratégia de custo (pesquisa em 21/11/2026)

**NÃO selecionar definitivamente um modelo antes do benchmark.** Arquitetura deve tornar possível trocar provedores e modos por feature flag, com cota por aluno e telemetria de custo.

| Opção | Vantagens | Custos e limites | Recomendação |
| --- | --- | --- | --- |
| OpenAI Realtime/GPT-Live com WebRTC | voz fluida, interrupção, turnos, ferramentas e latência reduzida | preço por tempo/áudio, exposição a tarifa e disponibilidade | candidato premium para benchmark de experiência |
| Cadeia ASR + LLM texto + TTS | controle sobre transcript, correção, memória e substituição por peça | maior latência de início e mais integrações; custo somatório | **padrão candidato do MVP** por previsibilidade pedagógica e economia |
| Google Cloud Speech-to-Text + TTS + LLM substituível | opções de vozes/idiomas, preço distinto por componente | custo por minuto/carácter, integração e região | alternativa a comparar com OpenAI |
| whisper.cpp + Piper ou outra voz local + LLM aberto | independente de cobrança por chamada; processamento local/servidor próprio possível | CPU/GPU/RAM, energia, operação, qualidade/latência, licenças por modelo e voz | prova de conceito, **não** presumir gratuito nem viável no Render Free |
| TTS do navegador | fallback rápido sem chamada remota do Lingua | vozes variam por aparelho/browser e sotaque, sem uniformidade | modo de contingência, não produto final |

**Referências públicas e parâmetros para planilha de custos** (verificar novamente antes da contratação):
- OpenAI GPT-Live 1.1: a página oficial consultada indica **US$ 0,05/min ativo, US$ 0,02/min standby**, faturamento por segundo. Não implica que o pipeline adicional esteja incluído.
- OpenAI GPT-Live-Transcribe: **US$ 0,017/min** na página de preços consultada.
- Google Cloud Speech-to-Text: preço depende da versão, canais, modelo, modalidade e duração; confirmar SKU/limites para idioma e volume.
- Google TTS: preços por voz/carácter; por exemplo Neural2 indicado a **US$ 16/milhão de caracteres** na tabela pública, sujeito a regras/franquias e mudança.
- Custos adicionais: tokens de LLM, TTS, cache, rede, armazenamento, GPU/CPU, renderização de voz, margem para repetição e suporte.

**Simulação explicativa (não previsão):** 1.000 alunos × 4 sessões/mês × 10 minutos ativos = 40.000 min. Somente tarifa de GPT-Live ativo a US$ 0,05/min ≈ **US$ 2.000/mês**, excluindo standby, texto, impostos, outras APIs e infraestrutura. Uma operação "sem custo de API" ainda paga infraestrutura e manutenção.

**Benchmark obrigatório antes de escolha:** qualidade de pronúncia em português e inglês; compreensão de sotaques/ruído; latência p50/p95 para primeira palavra/primeiro áudio; interrupção; vazamentos; custo por minuto útil (não minuto conectado); error rate por idioma; aderência a esquema de propostas; estabilidade; política de dados. Testar com voz e texto em 2G/3G/4G/Wi-Fi e hardware modesto.

Fontes: 
- https://developers.openai.com/api/docs/guides/voice-agents
- https://developers.openai.com/api/docs/guides/realtime
- https://developers.openai.com/api/docs/guides/voice-webrtc
- https://developers.openai.com/api/docs/pricing
- https://cloud.google.com/speech-to-text/pricing
- https://cloud.google.com/text-to-speech/pricing
- https://github.com/ggml-org/whisper.cpp

## 11. Segurança, governança e identidade

- Servidor emite credenciais efêmeras para clientes de voz quando necessário; segredo primário nunca trafega ao navegador.
- RLS/isolamento por userId ou equivalentemente verificações mandatórias em toda query; cookies seguros; origin/CSRF, limitação de taxa/custo; circuit breaker por aluno/IP/provedor.
- Prompt injection de leitura, links e áudio não concede ferramentas privilegiadas; entradas externas nunca mudam política.
- Não guardar voz sem consentimento nem iniciar mic invisível; indicador e modo desativado por padrão.
- Mostrar que o tutor é IA e pode errar, sem fingir relação pessoal humana ou disponibilidade ilimitada. Respeitar o nome escolhido e seus controles.
- Imputar dados pedagógicos somente a estudante autenticado e consentimento aplicável; demo isolada.
- Escopos corporativo/institucional segregados; não reutilizar dados sensíveis em produtos de terceiros por padrão.
- Políticas de privacidade, segurança e adequação jurídica antes da comercialização; plano específico se público infantil for adicionado.

## 12. Observabilidade e qualidade

Eventos técnicos auditáveis e minimizados:
- tutor_session_started/ended, voice_permission_granted/denied, text_turn, audio_turn, initiative_proposed/accepted/declined, memory_candidate_created/approved/rejected, srs_candidate_approved, provider_failover, error_class, latency, cost;
- cada evento tem timestamp UTC, id do usuário pseudonimizado para analytics, versão de consentimento/política, versão do prompt/modelo, correlação, origem e custo; sem raw audio/transcript em logs por padrão;
- contador de sugestões não atendidas e botão "não me interrompa" para evitar tutor insistente;
- dashboards de eficiência pedagógica separados de engajamento comercial.

**Teste do tutor deve cobrir:** iniciador de conversa sem repetir, aluno recusando sugestão, mudança de idioma, silêncio, atraso de ASR, erros da LLM, conteúdo externo com prompt injection, pedido de alterar nota/progresso, conta trocada, SRS due vs não due, consentimento revogado e uso de nome pessoal sem mudança de autoridade.

## 13. Critérios mínimos de aprovação (para implementação posterior)

1. Tutor se apresenta no primeiro login sem expor persona demonstrativa; aluno nomeia tutor, muda nome/voz/tom e pode pular.
2. Em modo texto e voz, funciona com legendas e pode voltar a texto sem perder aula; mic jamais ativa sem permissão explícita.
3. Tutor inicia proposição apropriada quando app aberto e autorizado, explica o porquê, respeita cooldown, silêncio e recusa.
4. Atividade conversacional alimenta **candidatos** de vocabulário, não gravações oficiais sem consentimento e aprovação.
5. Conversa consegue contextualizar SRS e leitura usando dados reais de conta, sem transformar agenda em domínio.
6. Memória editável/revogável e proveniência; nenhum histórico inventado.
7. Falha de fornecedor não corrompe sessão nem impede exercícios e revisão.
8. Medidas de latência, custo, segurança, testes pedagógicos e riscos documentados antes do piloto.
9. A LLM não consegue modificar currículo, certificação ou estado CSLE.
10. Assinatura de fundador + Deep na versão do documento, com registro de decisões de fornecedor e retenção.

**Questões pendentes para aprovação:** tom padrão; intensidade inicial de proatividade; nível mínimo de diagnóstico para voz; retenção e limites de custo; definição da primeira combinação de idiomas; se o perfil inicial permite menor de idade. Proposta padrão: tutor acolhedor e sóbrio, iniciativa leve, voz opcional, pt-BR→inglês, tratamento de menores adiado.
