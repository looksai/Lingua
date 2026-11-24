# Lingua — QA do TutorChat completo com HTTP, JWT e CAL reais em laboratório

**Data:** 24/11/2026 · **Status:** suíte automatizada local; somente testes fictícios. Não é login em produção ou homologação com alunos.

## Objetivo e novidade

A PR #68 testou uma **fixture parcial** React que conversava com o roteador HTTP real. A PR #70 montou o **TutorChat original** em Chromium, mas substituiu os hooks tRPC por um simulador local. Este laboratório junta as duas fronteiras: importa **sem modificar o TutorChat original** e o **trpc original**, configura `trpc.Provider`, `QueryClientProvider` e `httpBatchLink` com `superjson`, e acessa o **tutorRouter real** por Express HTTP, em `127.0.0.1` e porta efêmera.

A verificação JWT é do código real (`issueSession` e `verifySession`), os cookies são httpOnly fictícios. **Apenas o diretório de usuários autenticados, a consulta de perfil, o orçamento e o provedor de IA são simulados**. `placement.me` é uma resposta de leitura fictícia restrita por `protectedProcedure`. Não há conexão com Aiven, fornecedores de IA ou Render.

## Componentes e testes

- `client/qa/tutorchat-http.html` e `client/qa/tutorchat-http.tsx`: página de laboratório, não uma reprodução da UI. Usa o **componente real** `TutorChat`, com o mesmo cliente e provedores da entrada do aplicativo. O e-mail exibido na fixture é **apenas um hint de identidade para o estado React**; a autenticação do servidor depende exclusivamente do cookie JWT.
- `server/cal-browser-full-tutorchat-http.test.ts`: Express/tRPC real, flags CAL de teste, `vi.mock` do banco e do provedor, Vite em middlewareMode, Chromium Playwright no mesmo origin, sem dependências externas. Toda URL fora da porta efêmera localhost é abortada.
- `.github/workflows/browser-qa.yml`: adiciona esta suíte com `LINGUA_BROWSER_FULL_HTTP_QA=1` antes dos 7 testes de componentes e dos 5 testes de hooks mockados. Sem a flag, fica desativada no CI unitário padrão.

## Matriz de QA proposta

| ID | Jornada real na UI original | Resultado exigido |
|---|---|---|
| FH-01 | Enviar antes de consentir, depois autorizar e receber atividade | Zero chamada ao LLM anterior à autorização; HTTP com JWT válido, ticket CAL, ACK do DOM e progressão somente após confirmação; observação continua provisória |
| FH-02 | Dois navegadores separados, com cookies assinados A e B | B não confirma o ticket de A; servidor mantém sessões/cal independentes |
| FH-03 | Atualizar a página após iniciar tarefa | A UI recupera apenas o ticket pendente que o servidor associa ao JWT autenticado; não inventa um histórico |
| FH-04 | Reter resposta HTTP da conta A, trocar cookie JWT e identidade visual para B e liberar A | Resposta tardia de A não aparece em B e B volta a exigir autorização |

## Restrições e honestidade dos resultados

- **Não testamos login por senha e `createContext` real.** O diretório `users` é fictício. Uma sessão assinada válida de um usuário desconhecido não autoriza ações, mas a revogação real do usuário depende de banco/infra.
- **Não prova que a revogação de consentimento do cliente cancela uma requisição já recebida pelo servidor.** A política de revogação persistida e o bloqueio de commit de observações requerem implementação e teste futuros, com transações SQL e exclusão.
- Os testes de troca de conta manipulam cookies de **laboratório** via Playwright e mudam o hint de e-mail da fixture. Não exercitam o fluxo completo de logout/login da página App/PrivateExperience, nem persistência da tabela de usuários.
- O ACK sinaliza apenas a renderização de DOM. Não é prova de leitura humana. `inputModality:typed` é alegação do cliente, não atestação independente. `CAL` guarda apenas observações transitórias e provisórias; nada vira `learnerEvidences`, mastery, CEFR, certificação, SRS ou CSLE.
- Não valida áudio/microfone/TTS físicos, Android real, Safari iOS, persistência no Aiven, latência do Groq, pagamentos Stripe ou multi-instâncias Render.
- Nenhum segredo, credencial de aluno, identidade real ou banco de produção é usado. O browser só permite requisições ao endereço local.
- A suíte deve passar junto dos testes Chromium #64/#68/#70 e de TypeScript/Vitest/build antes de ser integrada à `main`. **Falhas, timeouts ou skips não são aprovações.**

## Próximas etapas

Se o laboratório for aprovado, expandir cenários de revogação quando uma requisição já chegou ao servidor, login/logout e contexto real num banco temporário exclusivamente fictício; validar Android/Safari físico e origem de ASR separadamente. Não executar migration nem ativar `learnerEvidence` sem revisão formal da governança pedagógica.
