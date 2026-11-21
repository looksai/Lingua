# Lingua — Fase A: Inventário e Saneamento (auditoria preliminar)

**Data-base:** 21/11/2026  
**Status:** PRELIMINAR, para auditoria adicional por Deep/fundador. Baseado no código da branch main consultada, histórico de PRs e observações de execução relatadas pelo fundador. Não substitui pentest, revisão jurídica, testes em dispositivos ou avaliação pedagógica.  
**Regra:** apenas diagnóstico e documentos nesta fase; nenhuma mudança de esquema/feature/deploy autorizada por esta auditoria.

## 1. Foto do sistema publicado

- Repositório: looksai/Lingua, branch main.
- Última versão principal observada: b702a7af9954efedf9f1a6e928c5d96602fc2407 (autenticação + demo distinguida).
- Infraestrutura observada: Render web service staging e MySQL gerenciado na Aiven; migrações 0000–0003 já aplicadas em staging. Essa constatação não prova comportamento em produção nem prontidão comercial.
- Fluxo real demonstrado: após login, header “conta conectada” coexistia com nome “Welma” no conteúdo de exemplo, mostrando separação insuficiente.
- PR #14: experiência de onboarding com perfil simples/MCQ e migração 0004, **encerrado sem merge e sem migração** por decisão fundador + Deep. Não reutilizar suas tabelas/avaliação como contrato aprovado.
- Nenhum adaptador real do CSLE integrado à experiência do aluno (contrato mock no frontend).

## 2. Matriz de inventário por área

| Componente/arquivo | Evidência observada | Estado | Direção |
| --- | --- | --- | --- |
| server/auth-local.ts + client/src/pages/Login.tsx | email/senha, hash scrypt, JWT cookie, sessão | staging funcional, sem lançamento comercial | preservar; revisar rate limit distribuído, verificação de email, recuperação e sessões |
| server/_core/index.ts / routers.ts | Express + tRPC, auth.me, rotas protegidas, health | operacional | reutilizar e revisar limites, error handling e observabilidade |
| drizzle/schema.ts + server/db.ts | users, localCredentials, knowledgeItems, userKnowledgeStates, reviewLogs | camada persistente funcional | preservar; evoluir perfis/consentimentos em migrações futuras aprovadas |
| shared/learning.ts + SRS | estados new/learning/review/relearning, reviewLogs, operação idempotente e replay | engenharia significativa existente | preservar specs/testes; SRS não significa domínio |
| client/src/lib/offline-learning.ts / offline-coordination.ts | fila por userId, id de operação, locks e broadcast | implementação parcial, verificar cross-browser | preservar; auditar localStorage, sincronização e dispositivos |
| client/src/components/ReadingLab.tsx | leitura clicável, palavras salvas, TTS do browser, media recorder, transcrição opcional | protótipo com componentes aproveitáveis | separar estado de sessão, contas, idiomas, licenças e tutor |
| client/src/components/ShadowingPractice.tsx | áudio LibriSpeech e métricas locais de ritmo/pausas | base real de áudio/feedback limitado | preservar, sem classificar pronúncia ou proficiência |
| client/src/components/ReviewDeck.tsx | revisões e logs; parte das preferências em localStorage | operacional parcial | manter; revisar conta/permissões, persistência de preferências |
| client/src/pages/Home.tsx | ~49k caracteres de shell demo, conteúdo e âncoras fixas, mockDecision | demonstração monolítica | quebrar em componentes e isolar do produto autenticado |
| client/src/lib/csle-contract.ts | interface PedagogicalEngine, demoInput, mockEngine | contrato conceitual/mock | manter como referência; reconciliação futura com especificação vigente do CSLE |
| client/src/components/AIChatBox.tsx | componente genérico com callback onSendMessage | **não comprova tutor** | reaproveitar UI somente após desenho do orquestrador |
| server/_core/llm.ts | wrapper de LLM vinculado a MANUS_API_URL/MANUS_API_KEY | dependência de plataforma legada | substituir por adapter de modelos com credenciais separadas |
| server/routers.ts / speech.transcribe | transcrição via endpoint MANUS configurado | integração dependente de serviço externo legado | não considerar ativa no Render sem configuração/benchmark |
| server/_core/voiceTranscription.ts | helper e documentação de transcription remota | não é diálogo bidirecional | refatorar para contrato ASR independente |
| client/src/contexts/ThemeContext.tsx + App.tsx | provider de tema switchable=false por padrão | dark theme não exposto ao usuário | criar tokens/temas e preferências reais |
| client/index.html + Home.tsx | pt-BR/inglês fixo, textos embutidos | sem i18n de produto | internacionalizar interface, conteúdo e voz separadamente |
| client/public/content/manifest.json | CMUdict, Tatoeba, LibriSpeech e LibriVox com metadados | conteúdo de referência parcial | revisar fonte/licença/curadoria e cobertura linguística |
| render.yaml | staging Free, auto deploy desligado e segredos externos | infraestrutura de teste | endurecer observabilidade, backups, custo, escalabilidade |
| Android/Play Store | sem cliente Android nativo ou pipeline de publicação identificado | não entregue | estudar depois do web MVP real |

## 3. Problemas P0 (antes de abrir ao público)

**P0-01 — experiência do aluno:** landing e demo misturadas com conta real, ausência de perfil/diagnóstico/plano real na main, conteúdo demonstrativo e nomes fictícios. Requer fluxo aprovado e separação por sessão.

**P0-02 — tutor inexistente:** texto “tutor ativo” e mock não substituem LLM conversacional, memória, voz ou proatividade. Não vender como existente.

**P0-03 — exposição de dados em falhas:** na primeira rodada de cadastro, exceção Drizzle revelou SQL e hash em tela; PR #11 mitigou mensagem e PR #12 tratou duplicado, mas revisão de erros, logs e todas as rotas ainda é necessária.

**P0-04 — governança de dados:** schema atual carece de plano aprovado para consentimentos por finalidade, memória do tutor, retenção/exclusão/exportação, controle do usuário, auditoria pedagógica, dados de voz e pesquisa autorizada. Ainda não testar usuários reais não convidados.

**P0-05 — componentes de fala dependem do Manus:** transcribe aponta para MANUS_API_URL/MANUS_API_KEY e o helper genérico também. O Manus não é infraestrutura confiável do produto independente.

**P0-06 — CSLE não integrado:** impedir interface de parecer CSLE ativo quando mockDecision está servindo eventos; separar dados simulados de aprendizagem real.

**P0-07 — segurança operacional:** rate limiting de autenticação apenas por processo; falta verificar recuperação e confirmação de email; política de custos e quota da LLM inexistente. Necessário plano de abuso, segregação de chaves, monitoramento, backup e teste de isolamento.

## 4. Pendências P1 e P2

- **P1:** modularização de Home, revisão de layout mobile, acessibilidade, tema/cores personalizáveis, i18n, controle de voz e legendas, currículo e itens versionados, fallback de áudio.
- **P1:** verificação de compatibilidade de offline queue com aparelhos modestos e navegadores sem Web Locks. Retenção em localStorage não criptografado requer decisão formal de risco e escopo.
- **P1:** diagnóstico justo de produção oral, listening e compreensão com rubricas; observação de sotaque e ruído; revisão de ASR/LLM com validação humana em amostras.
- **P1:** avaliação de custo de infraestrutura e fornecedor; evitar dependências de preços promocionais ou modelos em depreciação.
- **P2:** app Android/publicação; idiomas adicionais com currículo próprio, integrações institucionais/enterprise, notificações fora do app opt-in.

## 5. O que NÃO eliminar

1. Motor de repetição e testes em shared/learning.ts + logs.
2. Contratos e testes de fila idempotente, propriedade por usuário e rede.
3. Trabalho em leitura contextual/Shadowing e acesso à mídia aberta licenciada.
4. Infraestrutura autenticada, MySQL com TLS, disciplina de migration manual.
5. Separação explícita entre SRS, candidato a evidência e certificado; honestidade epistêmica.

Mas código aproveitável **não equivale a experiência aprovada**. Reutilização requer extração de componentes e novos testes de ponta a ponta.

## 6. Checklist para concluir Fase A

- [ ] Auditoria de riscos do fluxo de conta/sessão/erros e recuperação de acesso.
- [ ] Revisão MySQL de índices/privacidade/migrações e política de backups com credenciais mantidas em segredo.
- [ ] Inventário de toda dependência MANUS ou URL hardcoded e plano de remoção controlado.
- [ ] Mapa de UX: visitante, aluno novo, recorrente, offline, mic negado, troca de idioma, logout.
- [ ] Separação dos eventos reais, hipóteses e dados de demonstração em toda a UI.
- [ ] Revisão de licenças e fontes, especialmente áudio para redistribuição multinacional.
- [ ] Contrato de consentimento, exclusão, exportação, retenção e possível estudo agregado anonimizado.
- [ ] Instrumentação de custo, latência, segurança e qualidade mínima antes de contratar fornecedor LLM.
- [ ] Avaliação de acessibilidade e desempenho em celulares de baixo custo.
- [ ] Matriz pedagogia: competências obrigatórias, item bank versionado, rubricas, diagnóstico, prática, revisão e transferência.
- [ ] Atualização documental após aprovação formal com decisões e responsáveis.

## 7. Sinais de que Fase A foi concluída

Fundador e Deep validam este inventário; nenhuma dependência bloqueante ficou sem dono ou mitigação; fontes de verdade separadas; papéis Lingua/Tutor/CSLE assinados; contrato de dados aprovado; backlog priorizado sem confundir demo com produto. Isso **não** autoriza automaticamente deploy da fase B.

**Notas:** exames de PR, arquivos e logs em staging provam apenas comportamentos pontuais. Não realizamos auditoria exaustiva de componentes UI, testes de dispositivo, verificação de segurança independente nem medimos aprendizagem real de uma coorte.
