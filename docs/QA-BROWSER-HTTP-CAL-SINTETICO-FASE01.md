# Lingua / Naruto — QA Chromium + HTTP + CAL, identidades sintéticas (Fase 01)

**Estado:** suíte isolada de integração de navegador; não é login real nem homologação completa da aplicação.

## Objetivo

Combina o nível de interação DOM da PR #64 e o transporte Express/tRPC/JWT da PR #66 numa jornada com componentes e rotas **reais**, mantendo um ambiente local descartável e **sem** Aiven, Render, fornecedores de IA ou gravações reais.

## Arquivos e mecanismo

- `client/qa/http-integration.html` / `http-integration.tsx`: fixture React independente. Usa o componente **real** `TutorCatalogTaskView`; envia `fetch` com cookies same-origin ao endpoint **real** `/api/trpc/tutor.reply`, `catalogRenderAck` e `catalogPendingTask`. Conteúdos de aluno e respostas são **fictícios**. A fixture deliberadamente não é a página `TutorChat` completa.
- `server/cal-browser-http-synthetic.test.ts`: inicia Express em `127.0.0.1` e porta efêmera, com middleware HTTP **real** `enforceSameOrigin`, roteador tRPC real do tutor, JWTs assinados por `issueSession`/validados por `verifySession`. `createContext` com consulta ao MySQL é substituído **somente no teste** por diretório de usuários sintéticos em memória. Banco de perfis, billing e provider de IA são mocks.
- Um Vite `middlewareMode` transforma a fixture React na mesma porta e origem do Express; a instalação de Playwright fica em `/tmp` (fora do lockfile). Chromium headless cria contextos isolados por conta, com cookies httpOnly fictícios; toda URL fora do `127.0.0.1:<porta>` é bloqueada pelo navegador.
- `.github/workflows/browser-qa.yml`: adiciona execução explícita da suíte integrada com `LINGUA_BROWSER_HTTP_QA=1` ao job de Chromium existente. Sem essa flag, a suíte fica *skip* no CI unitário padrão. O job anterior de sete interações de componentes permanece.

## Cenários integrados

1. UI cria atividade, viewport gera recibo, `catalogRenderAck` confirma e uma resposta digitada progride ENSINAR→PRATICAR; segundo ticket/ACK permite observação **provisória** sem evidência oficial.
2. Cookies distintos A/B: B não consegue confirmar ticket de A nem receber seu objetivo.
3. Atualização da página: um texto de resposta guardado **exclusivamente pela fixture** em sessionStorage só é reexibido se o `catalogPendingTask` autenticado retornar o mesmo ticket; nenhum registro de aprendizado é restaurado.
4. Resposta com origem ASR, mesmo depois de ACK, não pontua tarefa fechada.
5. Navegador sem sessão não cria atividade; requisição de outra origem é proibida pelo middleware HTTP.
6. Reinício explícito do objetivo a partir do navegador invalida ticket antigo e descarta observações provisórias anteriores.

## Limites e fatos que os testes NÃO podem comprovar

- **Autenticação parcial, embora HTTP/JWT reais:** não exercita login por senha, verificação do usuário na tabela `users`, consentimento persistido nem revalidação de usuário revogado; contexto de usuários sintético.
- **Interface parcial:** o componente `TutorCatalogTaskView` é de produção, porém a página que envia as requisições é uma fixture de laboratório. Isso **não equivale** a rodar a página completa `TutorChat` com autenticação, configurações e todos os efeitos React de produção.
- **Sem dados reais ou memória pedagógica oficial:** observações CAL continuam em memória volátil; ACK de DOM é sinal do navegador e **não prova leitura humana**; `inputModality:"typed"` ainda é declaração de cliente, **não** atestação de digitação. Sem pronúncia, domínio, CEFR, certificação, SRS ou CSLE.
- **Sem dispositivos físicos:** Chromium em CI desktop e viewport móvel em teste de componente; não é Android nem Safari iOS. Não testa microfone real, latência Groq, TTS/autoplay, hardware e qualidade fonética.
- **Sem Aiven/Render:** não há MySQL, migração, serviço externo, deploy nem integração de múltiplos processos.
- O laboratório entrega apenas evidência de conformidade dos cenários explicitamente executados. Falhas de CI ou browser não podem ser declaradas como pass.

## Próxima etapa após CI verde

Expandir cobertura para a **interface completa do tutor** e um login sintético com contexto de sessão e consentimento auditável, se for possível sem tocar no Aiven e sem credenciais reais. QA de banco descartável com `createContext` verdadeiro requer planejamento separado. Revisar rubricas de aprendizagem e origem do ASR antes de qualquer registro oficial.

Atualizar [STATUS-ATUAL-DESENVOLVIMENTO.md](./STATUS-ATUAL-DESENVOLVIMENTO.md) com o HEAD de PR, CI e limites.
