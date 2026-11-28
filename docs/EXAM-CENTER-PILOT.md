# Lingua Exam Center — fase 1 (27/11/2026)

Decisão do fundador: um centro independente, compartilhado por Lingua Premium e Comunidade Premium. Não duplicar backend, banco ou infraestrutura. O CSLE permanece motor consultivo de aprendizagem; nenhum resultado deste piloto entra como evidência certificadora.

## Entrega
- Catálogo de oito exames, IELTS Academic e General Training com exercícios originais curtos de leitura, quatro questões por variante; demais exames identificados como em preparação.
- Versão de adaptador `ielts-reading-v1-2026-11-27`. Referências de formato: https://ielts.org/take-a-test/test-types/ielts-academic-test e https://ielts.org/take-a-test/test-types/ielts-general-training-test ; https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading/ e https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-reading/ (consultadas em 27/11/2026). Textos e questões originais, não material oficial.
- Correção determinística no servidor, tentativa por conta, prazo do servidor (5 min miniatividade, 30 min prática), replay idempotente enquanto sessão disponível, sem nota IELTS ou atestado de proficiência. Não é ambiente de prova inviolável; tutor global e consultas externas não são bloqueados.
- Interface com objetivo e resultado temporários, sem persistência; sessões em memória limitadas e descartadas após prazo + 5 min ou reinício. Sem migration.
- Acesso ao catálogo autenticado; treinamento negado por padrão. Autorização experimental exclusivamente por `LINGUA_EXAM_PILOT_ENABLED=true` e `LINGUA_EXAM_PILOT_ACCOUNTS` (objeto JSON, e-mail normalizado -> "lingua" ou "community"). Não comprova pagamento. Nenhuma configuração de ambiente aplicada nesta fase.
- Shell atual exige perfil/onboarding; acesso de assinante exclusivamente comunidade sem curso e autorização comercial persistente são pendências explícitas. Fotos exclusivas aguardam pacote; hero provisório reutiliza arte aprovada Estudar.
## Próximas etapas
1. QA CI e revisão; homologação de acesso piloto. Não ativar contratação nem apresentar conteúdo não disponível.
2. Ampliar banco editorial original e revisão humana; política de tentativas e armazenamento durável no banco existente, versão, isolamento, objetivos, relatórios, replays e consentimento.
3. Listening com áudio original/licenciado e reprodução controlada; Writing e Speaking com rubricas versionadas e avaliação humana de referência, sem extrapolar de transcrição para pronúncia.
4. Simulados completos por versão/modalidade, integridade, acessibilidade, modo examinador sem ajuda, calibração e incerteza. Só publicar estimativas de banda quando validadas.
5. Integrar recomendações CSLE como propostas sem autoridade certificadora e acesso dos dois planos via fonte autoritativa de entitlements. Comunidade-only não deve exigir curso.
6. Expandir adaptadores CELPIP, PTE, TOEFL, Cambridge e Duolingo com fontes oficiais atuais e conteúdo próprio.

## Fase 2 — Reading e Listening de prática
- Adaptador `ielts-reading-listening-v2-2026-11-28`: três conjuntos Reading por variante, dois Listening compartilhados, quatro questões por conjunto (32 questões originais distintas). Catálogo autorizado entrega identificador/título; a tentativa fica vinculada ao conjunto do servidor.
- Listening usa somente voz em inglês marcada como local pelo navegador; sem fornecedor externo de IA acionado pela aplicação. Se nenhuma voz local existir, a atividade não inicia. A transcrição é enviada ao cliente para síntese, mas não exibida antes da correção. Não é teste protegido contra consulta nem reprodução acústica equivalente ao exame; não há Listening cronometrado nesta fase.
- Testes unitários verificam seleção, correção e regras; QA Chromium usa API e voz sintéticas para verificar interação. Qualidade sonora em dispositivo real, variedade de sotaques, gravações próprias, persistência e avaliação calibrada permanecem pendentes.

## Fases 3 e 4 — Writing e Speaking
- Writing: quatro tarefas originais, tabela fictícia Academic, carta General e dois ensaios. Contagem e autoavaliação sem nota, sem histórico durável.
- Speaking: seis prompts para as três partes, preparação e gravação local limitada, revisão por reprodução. Sem envio de áudio, transcrição, entrevista dinâmica ou avaliação acústica. Chromium usa microfone sintético; validar dispositivos reais antes de ampliar o piloto.
- Feedback de Writing: flag `LINGUA_EXAM_AI_FEEDBACK_ENABLED=true` (desligada por padrão), autorização piloto e do provedor do tutor, consentimento registrado no perfil e ação explícita de envio. Usa orçamento existente e verificação de revogação da sessão; sem memória, CAL ou dados de certificação. Resposta qualitativa limitada a uma sugestão com trecho literal, validação de schema e rejeição de termos de pontuação; isso não garante correção linguística. Não ativar até revisão do consentimento de escopo, segurança, qualidade e custos. Sem alteração do ambiente.

## Fase 5 — sequência oral guiada
- Cinco perguntas originais em ordem Parts 1, 1, 2, 3, 3. Gravação local por pergunta, reprodução e checklist somente ao concluir a sequência. Reinício e desmontagem descartam URLs de áudio; nenhuma transferência externa.
- Preparação de Part 2 é opcional nesta prática; não representa uma prova integral nem imposição segura de tempo. Perguntas fixas, sem diálogo dinâmico de examinador e sem correção automática.
- Próxima etapa de persistência: separar objetivo, tentativa versionada, resultado e revisão de evidência; gravar por usuário autenticado no MySQL existente, sem armazenar áudio/redação por padrão. Definir idempotência, expiração, revogação, exclusão e política de retenção antes da migração. Nenhuma alteração de schema nesta fase.

## Fase 6 — persistência em laboratório (não conectada à aplicação)
- Schema aditivo separado, objetivo por conta (variante, banda desejada em meios pontos, data civil) e metadados de atividades objetivas concluídas (identificador, versão, modalidade, acertos e total). Sem respostas brutas, áudio, redação, nota estimada ou evidência certificadora.
- Repositório por usuário autenticado, chave única (usuário, tentativa), primeira gravação imutável, leitura recente limitada, exclusão isolada e cascata na exclusão de conta. O repositório não recebe totais do cliente em nenhuma rota; ainda não está conectado.
- Laboratório MySQL descartável testa persistência entre pools, concorrência, replay, validação e isolamento. Não foi alterado o journal de produção, o Render ou o MySQL existente.
- Antes da integração: revisão da migração no banco existente, transação de submissão com resultado autoritativo, política de tentativas persistentes e recuperação após reinício, exclusão serializada com submissão e invalidação de tentativas pendentes, retenção, interface de objetivo/histórico e testes de ponta a ponta. CSLE recebe apenas propostas autorizadas, jamais certificação automática.

## Fase 7 — ciclo durável em laboratório
- Tentativa ativa por conta, retomada após reinício, prazo e versão de conteúdo verificados no servidor. Versão não suportada exige nova tentativa. Uma nova tentativa substitui a ativa anterior.
- Transações serializadas pelo registro do usuário: início, conclusão, objetivo e exclusão. Correção, recibo imutável e metadados são gravados juntos. Reenvios retornam o primeiro recibo sem nova avaliação. Exclusão invalida também a tentativa ativa, impedindo reenvio de recriar histórico.
- O recibo contém somente correção por item, gabarito e explicações editoriais; não guarda alternativas escolhidas, redação ou áudio. Sem nota de proficiência.
- Esta implementação continua em laboratório; não há rotas novas nem migração aplicada. Antes de ligar: validar laboratório, preparar migration revisada, política de retenção e interface; utilizar exclusivamente o novo motor nas rotas persistentes, nunca os métodos de laboratório sem bloqueio do usuário. Nenhuma alteração de infraestrutura.

## Fase 8 — integração protegida da persistência
- `LINGUA_EXAM_DURABLE_ENABLED=true` é necessária além da autorização Premium piloto. Desligada por padrão: rotas de histórico/retomada negam acesso e o motor anterior permanece em memória. Ligada: início e envio usam exclusivamente o motor transacional; indisponibilidade de banco não provoca fallback em memória.
- Painel oferece salvar/carregar objetivo, retomar tentativa ainda válida (sem restaurar respostas não enviadas), consultar últimas 50 atividades objetivas e excluir objetivo, tentativa ativa e histórico mediante confirmação. Writing e Speaking continuam sem histórico persistente; metas não são pontuações medidas.
- SQL aditivo candidato em `drizzle/manual-review/exam-history-v1.sql`, aplicado pelo laboratório descartável no CI. Não modificar o journal existente: histórico do schema de produção requer inspeção e revisão antes de aplicar. SQL sem IF NOT EXISTS de propósito: divergência deve interromper rollout, não ser ocultada. DDL MySQL não é transação única; se houver falha parcial, inspecionar tabelas antes de retentar.
- Antes de ativar no Render: verificar estrutura e permissões do MySQL em uso, backup recuperável, política de retenção/expurgo e acesso a exclusão/exportação mesmo após perda de autorização Premium, validar UI e HTTP com conta autorizada. Nenhuma migração real, flag ou acesso de alunos foi alterado. Não há promessa de retenção ilimitada ou nota certificadora.
