# Lingua — OpenAI API no Render (Fase C / staging)

**Status:** código candidato em revisão, sem deploy desta fase. Nunca compartilhe uma chave em chat, print, PR, variável pública Vite ou código-fonte.

## 1. Conta e saldo

1. Abra https://platform.openai.com/ e entre na conta.
2. Crie um projeto separado para **Lingua staging**. Em https://platform.openai.com/api-keys , selecione o projeto correto e crie uma chave de serviço ou de projeto dedicada, com os menores privilégios compatíveis com os endpoints necessários.
3. Consulte https://platform.openai.com/settings/organization/billing/overview para cobrança da API (assinatura ChatGPT não inclui saldo de API). Confira compra mínima na tela. US$ 5 pode ser uma pequena verba inicial, **não é garantia de semanas ou meses de uso**.
4. Desative recarga automática para a experiência inicial, configure alertas e acompanhe https://platform.openai.com/usage . Limites de orçamento e recarga não equivalem a um teto absoluto de consumo. Veja https://help.openai.com/en/articles/8264644-what-is-prepaid-billing .
5. Copie a chave somente para o gerenciador de segredos do Render. Se vazar, revogue e gere outra.

## 2. Render — apenas depois da auditoria

Abra https://dashboard.render.com/web/srv-dc0mh2cs728c73ant6e0 e selecione **Environment** do serviço `lingua-p1-staging-le7u`, workspace My Workspace. Não altere Nordstar, DATABASE_URL, SESSION_SECRET ou CA.

| Variável | Valor |
|---|---|
| OPENAI_API_KEY | chave privada (somente servidor) |
| LINGUA_TUTOR_ENABLED | true para teste aprovado; ausente/false desativa API |
| LINGUA_TUTOR_ALLOWED_EMAILS | e-mail exato das contas autorizadas, separados por vírgula |
| LINGUA_TUTOR_TEXT_MODEL | gpt-4o-mini |
| LINGUA_TUTOR_ASR_MODEL | gpt-transcribe |
| LINGUA_TUTOR_TTS_PROVIDER | openai-legacy apenas para teste transitório |
| LINGUA_TUTOR_TTS_MODEL | tts-1 apenas para teste transitório |
| LINGUA_TUTOR_TTS_VOICE | alloy |

Use salvar sem deploy quando o painel oferecer essa opção; não implante esta fase antes do aceite do auditor e fundador. A chave é utilizada também pelo onboarding opcional, que passa a respeitar a mesma lista e quota de staging no código da Fase C. **Não adicionar a chave à versão anterior em produção:** ela ainda não contém essa proteção.

## 3. Ciclo de vida de voz

- ASR usa arquivo concluído, endpoint /v1/audio/transcriptions, modelo recomendado gpt-transcribe: https://developers.openai.com/api/docs/guides/speech-to-text .
- LLM usa Chat Completions, sem ferramentas, com perfil do usuário autenticado e histórico limitado.
- O adaptador TTS /v1/audio/speech é propositalmente **transitório, opt-in**, para experimentar tts-1. A data anunciada de encerramento desse endpoint/modelo legado é **06/01/2027**. O código desabilita essa opção nessa data.
- A OpenAI orienta migrar para gpt-realtime-2.1-mini via Realtime API (não compatível com /v1/audio/speech). Trocar só o ID do modelo quebraria a integração. A próxima decisão é construir e medir um adaptador de síntese por turno com o protocolo novo ou avaliar outro provedor. Isso não autoriza conversa full-duplex nem captação contínua.
- Referências: https://developers.openai.com/api/docs/guides/text-to-speech e https://developers.openai.com/api/docs/deprecations .
- Sem TTS, resposta textual fica disponível. Sem chave ou autorização, tutor mostra acolhimento e sugestões locais explicitamente rotulados, não simula IA.

## 4. Limites e privacidade

Sem nova tabela nem persistência de conversa nesta fase. Histórico limitado a 24 mensagens em RAM do navegador; últimas 8 enviadas à API quando consentido, áudio retido apenas nas últimas mensagens. Recarregar a página ou sair encerra a conversa. Nenhuma gravação em segundo plano. Captura até 20 s e 750 KB por gravação no cliente; servidor rejeita payload maior (metadados Fornecidos pelo cliente não comprovam duração). Respostas limitadas a 240 tokens e 1200 caracteres. Respostas do tutor nunca certificam, não executam ferramentas e não alteram SRS ou CSLE.

Opt-in de conversa por sessão distinto do consentimento de onboarding. Texto, histórico, preferências pedagógicas e gravação autorizada podem ser encaminhados ao provedor. Sem chave jamais transmitir. Sem e-mail nem ID do aluno enviados intencionalmente ao modelo. Informar que áudio é sintético. Conferir termos e retenção aplicáveis ao projeto antes de uso público.

A lista restringe acesso pago, mas a autenticação de staging ainda **não valida propriedade do e-mail**. Criar primeiro as contas autorizadas, confirmar seu controle, não incluir endereços ainda não registrados. Quotas 30 operações por usuário/dia, 100 globais/dia e 2 simultâneas por instância; são guardas locais, reiniciam com o processo e **não são limite financeiro garantido**; um turno de texto com voz pode consumir duas chamadas de fornecedor. ASR, texto, boas-vindas faladas e feedback opcional de onboarding consomem operações. Antes de abrir a terceiros, exigir verificação de e-mail, quotas persistentes, controle de custo por projeto, proteção de tamanho na entrada HTTP, testes de privacidade e abuso.

## 5. Roteiro de homologação

- Conta sem chave: login → chat abre → saudação contextual → resposta local identificada.
- Minimizar e reabrir em todas as abas do painel; histórico mantém-se sem reload.
- Conta de teste autorizada + API: habilitar consentimento → enviar texto → verificar resposta realmente IA.
- Habilitar áudio: preparar a saudação e usar controle de reprodução. Cada nova resposta pode vir com áudio e controle nativo. Navegadores podem bloquear auto-play; clicar em play é o comportamento previsto.
- Segurar microfone → falar PT/EN → soltar → conferir transcrição → enviar. Testar permissão recusada, cancelamento, sessão encerrada, navegador sem MediaRecorder, limite de 20 s, áudio indisponível e código HTTP 429.
- Desmarcar consentimento impede novas requisições externas; desativar o recurso no Render é o interruptor de desligamento. Mensagens já enviadas não podem ser retroativamente removidas do provedor por esse controle.
- Testar troca de conta, login/reload, fechamento, concorrência, respostas falsas ou vazias do vendor, isolamento e custo real de pelo menos 20 turnos.

**Gates:** CI check/test/build com mocks sem chave; auditoria independente; staging E2E com chave real e microfone; só então comparar custo e estabilidade. Não afirmar economia de 100x, tutor de voz validado ou aptidão a produção sem medição.
