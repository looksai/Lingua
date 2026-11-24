# Lingua / Naruto — integração HTTP autenticada com contas sintéticas (laboratório)

**Data:** 24/11/2026. **Escopo:** Express + tRPC + verificação JWT reais, diretório de contas e provedor de IA falsos. **NÃO** é autenticação integral de produção ou teste com banco real.

## Avanço sobre as PRs #55 e #64

A PR #55 testa o roteador tRPC em memória por meio de `createCaller`; a PR #64 testa os componentes React reais dentro de Chromium headless, mas sem servidor. Esta etapa acrescenta o **fio HTTP real**: um processo Express abre uma porta dinâmica exclusivamente em `127.0.0.1`, aplica `enforceSameOrigin`, usa `createExpressMiddleware` com o verdadeiro `tutorRouter`, recebe cookies de sessão assinados pelo mecanismo `issueSession` e valida os JWTs via `verifySession`.

O ambiente **não** chama `createContext` de produção, pois esse caminho procuraria o usuário no MySQL/Aiven. Em vez disso, uma função **exclusiva do teste** associa JWTs válidos a duas contas fictícias de diretório, criando identidades diferentes a cada caso. O banco de perfis, o serviço de IA e o controle de orçamento são simulados via `vi.mock` e nunca consultam serviços reais.

## Cobertura de rede prevista

| Caso | Requisição real ao Express | Resultado esperado |
|---|---|---|
| HT-01 | Iniciar exercícios com dois JWTs sintéticos válidos | Tickets e objetivos distintos por conta |
| HT-02 | Sem sessão, sessão adulterada ou JWT de usuário fora do diretório | HTTP 401, sem consultar perfil |
| HT-03 | Cookie válido com `Origin` de outro host | HTTP 403, middleware real rejeita |
| HT-04 | Enviar resposta antes do ACK; confirmar depois; repetir ACK | Sem avanço antes da entrega; `recorded` e `duplicate`, depois avanço |
| HT-05 | Conta B tenta usar ticket de A | `rejected` e nenhuma alteração em A |
| HT-06 | Transcrição ASR após ticket confirmado | Não é avaliada como digitação nem nota fonética |
| HT-07 | `consent:false` na requisição | Resposta local e nenhuma nova observação CAL |
| HT-08 | Simular reload consultando `catalogPendingTask` | Só o proprietário assinado recupera seu ticket |
| HT-09 | Reiniciar assunto com escolha explícita | Sessão nova e ticket velho inválido |
| HT-10 | Schema de ticket malformado | HTTP 400 |

## Requisitos de segurança do laboratório

- O servidor de teste abre uma porta **efêmera na interface localhost**; nenhuma porta pública, túnel, serviço externo ou conexão ao staging.
- A chave `SESSION_SECRET` é um texto fictício próprio do teste; **jamais** utilizar em deployment.
- Apenas dados de contas `synthetic.invalid`, ids sintéticos e mensagens pedagógicas de exemplo.
- Não há senha real, cadastro, cookies de navegador persistidos ou registro de aluno.
- A suíte não executa migrations, `db:push`, `auth.login` real, provider real, billing, SRS, CSLE, `learnerEvidences`, Aiven ou Render.
- Como `createContext` de produção **não é usado**, o teste cobre a integridade JWT e o controle por usuário do roteador, mas **não comprova** a consulta real à tabela `users`, revogação efetiva de conta, login por senha ou múltiplas instâncias.
- A confirmação DOM continua declarativa e pode ser forjada por cliente adulterado. HTTP 200 + ACK não prova aprendizagem, pronúncia ou domínio.

## Portões e sequência seguinte

Aprovar somente após TypeScript, Vitest e build verdes. **Nenhum deployment** é necessário porque o arquivo novo é um teste inerte. Manter QA real com duas contas descartáveis no staging **pendente** até autorização, incluindo Chrome Android/iOS Safari, microfone, autoplay, login, consentimento, refresh/cold start e proveniência.

O próximo degrau ideal é conectar a fixture React a um servidor de laboratório e verificar cliques do browser disparando os mesmos endpoints tRPC, com zero dependências externas. Isso exigirá garantir que as sessões fictícias não escapem do ambiente e que a execução permaneça restrita ao CI.
