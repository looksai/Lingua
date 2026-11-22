# Lingua — homologação sem créditos (Groq + Gemini)

**Escopo:** ambiente staging privado/contas adultas já cadastradas e controladas pelo fundador; nenhum lançamento público. Manter projetos dos provedores em seus planos gratuitos, sem ativar faturamento. Chaves não garantem cotas nem disponibilidade. Sem fallback pago.

## Render

Somente depois de CI e autorização de merge/deploy. Serviço lingua-p1-staging-le7u, My Workspace. Não tocar em Nordstar, DATABASE_URL, SESSION_SECRET ou certificados.

| Variável | Valor |
|---|---|
| LINGUA_TUTOR_PROVIDER | groq-gemini |
| LINGUA_TUTOR_ENABLED | true |
| LINGUA_TUTOR_ALLOWED_EMAILS | e-mail da conta de teste adulta já cadastrada e controlada |
| GROQ_API_KEY | segredo criado no Groq |
| GEMINI_API_KEY | segredo criado no Google AI Studio |
| LINGUA_GROQ_TEXT_MODEL | openai/gpt-oss-120b (padrão, opcional) |
| LINGUA_GROQ_ASR_MODEL | whisper-large-v3-turbo (padrão, opcional) |
| LINGUA_GEMINI_TTS_MODEL | gemini-3.8-flash-lite-tts (padrão, opcional) |

Colocar somente no painel Environment. Não enviar chaves ao GitHub ou chat. Remover OPENAI_API_KEY do ambiente de staging se não for usado; manter demais segredos. O modo sem seleção explícita fica inativo, e o modo groq-gemini não autoriza o adaptador pago nem o feedback antigo de onboarding via OpenAI. Sem alteração de banco.

## Separação por privacidade

- Groq: resposta textual contextual e transcrição do áudio enviado explicitamente, com consentimento por sessão vinculado ao provedor. Limites existentes, conta autorizada e sem retries automáticos. A voz gravada não comprova pronúncia. Observe as políticas de dados do Groq; testar com dados fictícios, sem dados sensíveis.
- Gemini gratuito: seus termos proíbem enviar dados pessoais, sensíveis ou confidenciais; podem usar entradas e respostas para melhoria, inclusive revisão humana. O código **só envia frases fixas e fictícias escolhidas por índice**, sem nome do estudante/tutor, perfil, conversa ou gravação. A demonstração separada usa consentimento próprio. Não representa ainda voz dinâmica Gemini no tutor. Não usar com menores de idade, alunos reais ou como acesso público.
- Voz dinâmica: botões PT/EN usam exclusivamente vozes marcadas locais pelo navegador (SpeechSynthesis). Podem não existir no dispositivo. Não enviar texto para uma voz remota oculta. Uma voz escolhida para todo o texto bilíngue pode pronunciar o outro idioma de forma imperfeita. Não é feedback fonético.
- O limite local de 30 operações por conta/dia e 100 globais/dia continua, sem garantia financeira. Quotas dos provedores podem variar; checar console e não ativar planos pagos. Sem fallback de Groq para OpenAI ou geração automática de Gemini sobre histórico.
- Fase B permanece funcional em modo local; consentimento de onboarding antigo para OpenAI não é autorização para Groq.

## Homologação

1. Verificar os planos gratuitos e limites no console Groq e AI Studio.
2. Fazer login de teste, aceitar envio ao Groq, escrever "Quero praticar inglês com solda MIG e TIG". Verificar resposta contextual de IA, não texto guiado local.
3. Segurar microfone, falar uma frase curta fictícia, soltar, revisar transcrição e enviar.
4. Usar Ouvir local PT ou EN. Se navegador não tiver voz local, registrar isso como limitação.
5. Abrir Testar voz Gemini, aceitar a autorização separada e gerar uma frase fixa. Reproduzir WAV. É prova do adaptador de síntese, não de voz arbitrária.
6. Checar erro 429 e falha dos provedores (sem retry, sem fallback pago), isolamento, retorno ao texto e quotas. Nenhum teste mockado prova que as chaves reais têm acesso.
7. Antes de disponibilizar voz dinâmica externa aos alunos, selecionar um provedor e termos compatíveis com dados pedagógicos, aprovar privacidade, e medir custos, qualidade e acesso. O SRS, CSLE e avaliação oficial permanecem isolados.

Referências oficiais verificadas em 22/11/2026:
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/api-reference
- https://console.groq.com/docs/your-data
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/speech-generation
- https://ai.google.dev/gemini-api/terms
