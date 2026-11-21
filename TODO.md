# Lingua — resultados do MVP

> **Fora do escopo intencional:** gamificação, ranking, rede social, chat estilo MSN e mensagens temporárias. O repositório anterior é referência, não uma lista de funcionalidades a copiar.

## 1. Shell ativo do tutor e rota principal — concluído

- O aplicativo apresenta um tutor ativo com uma próxima ação clara, em vez de uma tela genérica de boas-vindas.
- A navegação interna separa Início, Aprender, Explorar e Evidências.
- O currículo comum permanece visível como uma linha de âncoras e não desaparece quando o estudante escolhe explorar.
- A interface é responsiva e mantém a mesma hierarquia em desktop e telas estreitas.

## 2. Lição âncora com prática e transferência — concluído

- A lição usa `am / is / are` como objetivo obrigatório e apresenta exemplos de contexto profissional.
- A prática separa compreensão, recuperação, aplicação e transferência, mostrando contexto e nível de auxílio.
- Há alternativa de pausar, explorar brevemente e retornar à âncora sem penalidade.
- O estudante recebe feedback formativo, não uma certificação automática.

## 3. Exploração opcional por interesses e mídia externa — concluído

- A área Explorar oferece ramos ligados a mecânica, trabalho no exterior, vídeo e episódio de série.
- Vídeos e séries são tratados como pontos de entrada para uma aula, com trilha de atenção e ponto de retorno.
- O protótipo não afirma que uma fonte externa é válida ou que assistir equivale a dominar; isso fica explícito na interface.

## 3A. Laboratório de leitura contextual — concluído

- A área Ler apresenta um texto curto com palavras clicáveis, significado contextual e exemplo no próprio texto.
- O estudante pode salvar vocabulário para revisão futura sem transformar o ato de salvar em evidência de domínio.
- Uma pergunta de compreensão registra a separação entre leitura assistida e evidência formativa.
- O trecho pode ser ouvido por síntese de voz do navegador, sem dependência de serviço externo.
- O estudante pode gravar e reproduzir uma resposta localmente; a interface deixa explícito que não há nota automática ainda.

## 4. Painel de evidências e retenção — concluído

- O painel distingue reconhecimento, compreensão, recuperação, aplicação e transferência.
- A interface exibe domínio estimado, itens a revisar e retenções planejadas em 7, 30 e 90 dias.
- Os rótulos distinguem hipótese, implementação e simulação.
- O produto mostra limites e incerteza, sem usar um único acerto ou autoavaliação como certificação.

## 5. Contrato de integração CSLE — concluído

- Existe uma camada de contrato desacoplada com âncora, requisito, observações autorizadas, limites, ações elegíveis e registro auditável.
- A implementação mock pode ser substituída pelo motor real sem reescrever o shell da aplicação.
- O contrato deixa explícito que o LLM propõe conteúdo e que consentimento, critérios e aprovação continuam fora da autoridade do gerador.

## 6. Persistência e integração do motor real — aberto

- Migrar perfil, currículo, eventos e evidências para o banco gerenciado.
- Criar autenticação e modelo de proprietário/estudante para substituir o perfil demonstrativo.
- Conectar o avaliador CSLE real atrás da interface `PedagogicalEngine`.
- Validar fontes externas e instrumentar auditoria, consentimento, retenção e transferência antes de tratar resultados como evidência real.

## 7. Pipeline de avaliação de fala — fundação entregue

- A gravação local agora aparece como primeiro estágio de uma cadeia explícita: gravação, transcrição, análise e evidência.
- O aplicativo só habilita “preparar para transcrição” depois que existe uma gravação; não cria nota ou domínio automaticamente.
- O contrato `speech-contract.ts` define submissão, segmentos de transcrição, incerteza, indicadores e autoridade proposta para o futuro adaptador Whisper/CSLE.
- O adaptador `speech-adapter.ts` permite executar uma transcrição demonstrativa e exibir o texto para revisão humana, sem atualizar evidências automaticamente.

## 8. Transcrição real autenticada — concluído como integração inicial

- A gravação pode ser enviada por uma mutation autenticada ao endpoint Speech da plataforma usando Whisper.
- O servidor normaliza segmentos e idioma para o contrato interno; a chave do serviço nunca chega ao navegador.
- Falhas de configuração, formato ou tamanho retornam mensagem tratável e não acionam loops de retry.

## 9. Revisão humana da transcrição — concluído como fundação

- O texto retornado pelo serviço é editável antes de qualquer registro.
- A confirmação cria apenas uma `SpeechObservationCandidate`, identificando quem revisou, se houve correção e a incerteza.
- A candidata fica em estado de aguardo de análise; ela não é convertida automaticamente em domínio, acerto ou certificação.

## 10. Catálogo de conteúdo aberto e áudio — lote inicial concluído

- CMUdict foi ingerido localmente com 135.166 entradas, sistema ARPAbet, hash da fonte e aviso de licença preservado.
- Tatoeba foi ingerido como amostra textual de 24 frases em inglês, preservando ID, autor, licença e URL por item; o áudio permanece fora deste lote por ter licenças granulares.
- LibriSpeech / OpenSLR SLR12 foi registrado como fonte de áudio + transcrição com licença CC BY 4.0 e URL de subset; arquivos pesados não são versionados no Git.
- LibriVox foi catalogado com seis itens via API, mantendo estado de revisão territorial antes de redistribuir gravações.
- A interface Explorar exibe a biblioteca de fontes, seus estados, funções e avisos de procedência.
- A biblioteca oferece um preview de capítulo LibriVox pelo URL oficial, sem hospedar ou redistribuir o arquivo automaticamente.
- O manifesto `client/public/content/manifest.json` e o plano `docs/content-integration-plan.md` registram licença, atribuição, hashes, estados e próximos lotes.

### 10A. Subsets de áudio auditados — aberto

- Baixar e armazenar um subset pequeno de LibriSpeech com checksums, transcrições e atribuição CC BY 4.0.
- Quatro previews LibriSpeech já foram ingeridos individualmente como WAV, com transcrição, speaker/chapter IDs e SHA-256; o corpus completo continua fora do Git.
- Adicionar Common Voice após filtro de locale, validação, privacidade e takedown.
- Revisar títulos/obras do LibriVox por jurisdição antes de hospedar áudio no Lingua.

## 11. Itens de conhecimento, SRS e shadowing — concluído como fundação auditável

- O contrato compartilhado de palavras/frases foi criado em `shared/learning.ts`, separado do ID da lição, com fonte, licença, idioma, contexto e âncoras curriculares.
- `docs/srs-spec.md` formaliza SM-2, qualidade, EF, passos, relearning, jitter, arredondamento, teto e exemplos.
- O serviço SM-2 implementa a especificação, incluindo `again`, `hard`, `good`, `easy`, estados novo/aprendendo/revisão/reaprendizagem e jitter testável.
- O feedback de shadowing local em `client/src/lib/shadowing-feedback.ts` compara duração e pausas; o Whisper permanece remoto, opcional e separado.
- O feedback continua formativo e não cria nota, domínio ou evidência automática.

## 12. Fila de revisão no Laboratório de Leitura — concluído localmente

- Palavras salvas no texto agora criam estado SRS local e aparecem como itens de conhecimento da sessão.
- O Laboratório mostra o item em foco, quantidade para revisar, estados de retorno e quatro escolhas de lembrança.
- Cada escolha exibe o próximo intervalo e registra uma mensagem explícita de que agendamento não é evidência de domínio.
- A persistência ainda é local à sessão; banco, review logs duráveis e sincronização ficam abertos para a próxima etapa.

## 13. Persistência de aprendizagem no banco — concluído como fundação

- O schema Drizzle agora possui `knowledgeItems`, `userKnowledgeStates` e `reviewLogs`, com índices para busca e fila por proprietário.
- A migração aditiva `drizzle/0001_great_maggott.sql` foi gerada e aplicada ao banco gerenciado sem apagar tabelas existentes.
- Procedures protegidas `learning.saveItem`, `learning.reviewQueue` e `learning.review` foram adicionadas ao servidor.
- O servidor calcula a transição SRS e grava o review log; o cliente local continua sendo fallback até a próxima etapa de sincronização.

## 14. Laboratório conectado à persistência — concluído como sincronização inicial

- O Laboratório consulta `auth.me` e hidrata a fila disponível quando existe sessão autenticada.
- Salvar uma palavra chama `learning.saveItem`, cria/recupera o item compartilhado e associa o estado SRS ao usuário.
- Avaliar uma revisão chama `learning.review`; o servidor calcula a transição e grava o `review_log`.
- Falha de autenticação, banco ou rede não bloqueia o estudo: o laboratório mantém o estado local e informa o modo ativo.
- O Laboratório agora hidrata todos os itens salvos com `learning.listItems`, não apenas os itens vencidos.
- A área dedicada “Revisar” permite alternar entre itens vencidos e todos os salvos, mantendo o mesmo contrato SRS.
- Após cada revisão persistida, a lista é invalidada e recarregada para refletir o estado do servidor.
- Remover uma palavra desvincula apenas o estado daquele usuário; o item compartilhado e o histórico de revisão não são apagados por engano.

## 15. Shadowing — fundação entregue

- O Laboratório oferece um exercício de shadowing com áudio LibriSpeech local auditado, transcrição correspondente, licença CC BY 4.0 e atribuição visível.
- A prática separa o áudio original da gravação do estudante em A/B, mantendo a gravação local à sessão.
- Quando o microfone não está disponível, o estudante pode praticar sem gravar e receber uma próxima ação formativa baseada em auto-observação.
- A gravação, quando disponível, recebe métricas locais determinísticas de duração e pausas; falha de rede/Whisper não bloqueia o exercício.
- O gravador separado do pipeline Whisper continua disponível para transcrição autenticada e revisão humana.

## 16. Sincronização offline — fundação P0 especificada; servidor ainda aberto

- Salvamentos, revisões e remoções que falham ficam em uma fila durável no `localStorage`, com tipo, chave local, payload mínimo, `operationId` e timestamp.
- A fila é reproduzida em ordem, deduplicada no cliente e expira operações com mais de 30 dias; cada operação só é removida após confirmação do servidor.
- `replayReviewLogs` fornece reconstrução pura e teste de equivalência com a aplicação incremental.
- A fila não envia transcrições, autoavaliações, acertos ou decisões pedagógicas ao CSLE.
- Idempotência server-side, conflitos persistentes, múltiplas abas e criptografia local continuam abertos.

## 17. Review logs analíticos — fundação entregue

- A procedure protegida `learning.history` retorna somente logs de revisão do usuário autenticado, associados ao item de conhecimento.
- A área Revisar exibe a distribuição recente de `again`, `hard`, `good` e `easy` como telemetria da agenda.
- O texto da interface explicita que review logs não estimam proficiência, não substituem evidência e não são enviados ao CSLE como domínio.
- Relatórios longitudinais, retenção configurável e exportação auditável continuam abertos para uma etapa posterior.

## 18. Relatório longitudinal, retenção e exportação auditável — fundação entregue

- A área Revisar permite observar os review logs em janelas de 30 dias, 90 dias ou todo o histórico disponível.
- A interface resume distribuição das quatro escolhas SRS e ritmo diário observado, sem transformar frequência em meta ou proficiência.
- O estudante pode ativar ou pausar marcos locais de retenção em 7, 30 e 90 dias; a configuração não altera o estado SRS nem cria evidência.
- O botão de exportação gera `lingua.learning-audit.v1` em JSON com itens, estados, logs, fontes/licenças disponíveis, período, plano local e limites de interpretação.
- O export não inclui transcrições, autoavaliações ou decisões CSLE.

## 19. Relatório vivo para continuidade do projeto — entregue

- `docs/lingua-project-report.md` registra visão, arquitetura, áreas entregues, fontes, contratos, persistência, SRS, offline, shadowing, limites CSLE, checkpoints e próximos passos.
- O arquivo deve ser atualizado a cada nova etapa relevante para que outras IAs e colaboradores possam retomar o trabalho sem depender do histórico da conversa.

## 20. Dívidas P0 de SRS, shadowing e offline — concluído com limites documentados

- `docs/srs-spec.md`, `docs/shadowing-spec.md` e `docs/offline-sync-spec.md` são as fontes de verdade do checkpoint.
- Testes determinísticos cobrem os quatro ratings em todos os estados, piso/teto de EF, promoção, relearning, jitter, reconstrução, deduplicação, expiração e shadowing sem rede/autenticação.
- Idempotência server-side por `(userId, operationId)` e reconstrução persistente com timestamps exigem alteração de schema/procedure e permanecem como próxima etapa.
- Lock/lease para múltiplas abas, criptografia local e garantia de cache do áudio após nova abertura permanecem como dívidas explícitas.

## 21. Correções P0 propostas pelo GPT após recuperação do ZIP — aguardando auditoria do Deep

- [x] Código de idempotência server-side e migration `0002` criados em cópia isolada (não aplicados).
- [x] Operação SRS com ID estável antes da primeira tentativa e ACK reutilizável em retries.
- [x] Replayer SRS com semente por usuário/item e ciclo de vínculo; reconstrução transacional explícita implementada em código.
- [x] Fila isolada por conta e rebind do ID de servidor para operações dependentes.
- [x] Conteúdo criado via cliente com chave privada derivada no servidor; atualização de metadados compartilhados desabilitada.
- [x] 13 testes isolados da fila, SRS e isolamento aprovados sem dependências de projeto.
- [ ] **Bloqueante:** `pnpm check`, `pnpm test` e `pnpm build` em ambiente com dependências.
- [ ] **Bloqueante:** testar migration, locking, idempotência concorrente e reconstrução em MySQL de teste.
- [ ] **Bloqueante:** aprovar política de legados, reconciliação de linhas compartilhadas e troca de conta no navegador.
- [ ] **Bloqueante:** revisão independente do Deep e aprovação humana para qualquer commit/deployment.

Ver `docs/P0-IMPLEMENTACAO-GPT-PARA-DEEP.md`. Este registro não significa checkpoint aprovado ou concluído em produção. O `docs/srs-spec.md` permanece inalterado.
