# Lingua — VoiceProvider e opções de soberania de voz
**Pesquisa e arquitetura candidata — 22/11/2026. Somente staging. Não ativar fallback.**

## Decisão atual
- **Único provedor neural implementado:** Groq/Orpheus V1 English, via `GROQ_API_KEY`, sem alterações no payload ou na escolha existente de seis vozes.
- **Novo contrato:** `server/voice-provider.ts` declara `VoiceProvider`, `VoiceRequest`, `VoiceResult`, `VoiceProviderId` e a fábrica `createVoiceProvider()`. A rota `tutor.neuralEnglish` chama exclusivamente `createVoiceProvider("groq").synthesize()`, que delega à implementação testada `synthesizeEnglish` em `server/groq-tts.ts`.
- Os IDs `kokoro`, `elevenlabs`, `wavespeed` e `local` são **reservados na tipagem, mas rejeitados em tempo de execução**. Não há troca automática por erro, timeout, cota ou pagamento. Não existem chaves, endpoints, dependências ou workers novos para esses destinos.
- Contrato inicial: `text`, `voice`, `language:"en-US"`, `format:"wav"` → `audioBase64`, `audioMime:"audio/wav"`, `text`. O teto 200 caracteres, vozes permitidas, timeout, validação WAV, autenticação, autorização da conta, consentimento e limites de estágio permanecem na implementação atual. Não é interface de streaming nem TTS de português.
- Mudança compatível: backend somente. **Nenhum banco, onboarding, SRS, CSLE, Stripe, plano pedagógico ou UI é alterado**. O PR #23 e a migration 0006 continuam fora deste PR.

## Opções avaliadas

| Opção | Qualidade/pontos fortes | Custo de referência em 22/11/2026 | Licenciamento e limites | Riscos/viabilidade |
| --- | --- | --- | --- | --- |
| **Groq Orpheus V1 (atual)** | Inglês expressivo; seis vozes, baixo atrito de integração, WAV e endpoint atual já implementados | US$22 por 1 milhão de caracteres em modalidade tarifada; há cotas gratuitas por organização. 200 caracteres ≈ US$0,0044 de referência tarifada, não uma cobrança no nível gratuito | Serviço comercial sujeito aos termos do Groq/Canopy Labs; **não presumir Apache-2.0**. Apenas inglês para este modelo; máximo 200 caracteres por chamada. Limites gratuitos publicados devem ser checados na conta (ex.: 100 requisições/dia por organização, sujeitos a mudança). | A cota grátis não suporta presumidamente 100 pagantes ativos; não demonstramos ainda latência/voz sob volume real. Erro 429 não pode disparar fallback pago |
| **Kokoro-82M (open weights)** | Modelo leve de 82 milhões de parâmetros, possibilidade de inferência em CPU e controle de implantação; bom candidato a voz própria/curadoria | Pesos sem tarifa por chamada; hospedagem, RAM, CPU, rede, manutenção e monitoramento custam recursos. **Preço operacional depende de teste** | Pesos publicados como **Apache-2.0** por hexgrad; preservar avisos/licenças das dependências e pacotes de voz específicos. Modelo publicado com foco em inglês; português e sotaques precisam ser testados, não presumidos | Execução em CPU é tecnicamente plausível, mas qualidade, latência, concorrência e memória exigem benchmark. O Render Free não é backup de produção garantido |
| **ElevenLabs API** | Grande catálogo de vozes, boa qualidade, opções multilíngues, clonagem e design de voz | Existe plano gratuito para ensaio; Starter anunciado a partir de US$6/mês (promoções temporárias podem variar); cobrança de produção por plano/modelo/caracteres | Serviço proprietário, sujeito a licença e limites de uso comercial; plano gratuito não deve ser presumido autorizado para comercialização. Clonagem exige direitos e consentimento da pessoa | Custos recorrentes e dependência de API; avaliar orçamento, privacidade, latência, disponibilidade e termos antes de ativar |
| **WaveSpeedAI (ex. OmniVoice)** | API REST com vários modelos, opções de desenho de voz e síntese multilíngue | OmniVoice publica US$0,005 até 100 caracteres e US$0,05 por 1.000 caracteres. Pode haver créditos de teste, **não assumir gratuidade recorrente** | Plataforma proprietária e modelos de terceiros com termos/licenças próprios. Direitos comerciais dependem do modelo contratado; verificar antes de produção | Integração assíncrona por envio e polling; necessidade de proteger URLs de áudio, chaves, retenção e teto de orçamento. Tarifas mudam por modelo |
| **Voz local do dispositivo** | Funciona sem cobrança de API quando uma voz local de fato está instalada, sem enviar texto a serviço externo | US$0 de API | Depende de licença da voz instalada no sistema/navegador; não cria propriedade do Lingua sobre ela | Qualidade variável: pode soar como “robô de lata”. Não confundir com Groq neural |

Fontes oficiais (consultadas 22/11/2026):
- Groq Orpheus: https://console.groq.com/docs/text-to-speech/orpheus
- Limites gratuitos Groq: https://console.groq.com/docs/rate-limits
- Kokoro Apache 2.0: https://huggingface.co/hexgrad/Kokoro-82M
- Repositório Kokoro: https://github.com/hexgrad/kokoro
- ElevenLabs preços/API: https://elevenlabs.io/pricing/api
- ElevenLabs capacidades/uso: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- WaveSpeed OmniVoice preço e API: https://wavespeed.ai/models/wavespeed-ai/omnivoice/text-to-speech
- WaveSpeed licenças de terceiros: https://wavespeed.ai/static/third-party-licenses
- Hugging Face Spaces: https://huggingface.co/docs/hub/spaces-overview

## Atenção: Hugging Face Space gratuito não é uma garantia
A documentação atual informa que **CPU Basic tem preço de hardware US$0/h**, mas **criar novos Spaces Gradio ou Docker com computação requer um plano pago** (Spaces estáticos são gratuitos; não executam inferência Python de Kokoro). Isso pode inviabilizar a ideia de abrir *agora*, com zero orçamento, um novo Space TTS. Spaces CPU gratuitos já existentes também hibernam quando inativos (consulte política vigente). **Não criar nem conectar nenhum Space** sem confirmar elegibilidade no console, autenticação, política de privacidade e performance.

Para um teste futuro do Kokoro:
1. Primeiro executar uma PoC *offline* em hardware autorizado, com frases fictícias em inglês, sem dados de alunos.
2. Medir cold start, latência p50/p95, memória, tempo de CPU, tamanho do áudio, qualidade percebida e concorrência com 1, 5 e 10 usuários; medir custo de hospedagem e egress.
3. Verificar toda a cadeia de licenças (pesos, vozes, biblioteca, runtimes) e limitações comerciais.
4. Escolher hospedagem que permita controle de acesso e autenticação server-to-server: **nunca usar Space público como endpoint de alunos pagos sem limites e proteção**.
5. Só depois de aprovação do fundador + Deep, desenvolver adaptador, testes independentes, privacidade e um seletor explícito. Mesmo assim, **fallback automático pago segue desativado por padrão**.

## Gates para um segundo provedor
- Definir catálogo de vozes com IDs próprios (não mapear cegamente `troy`/etc a vozes de outro fornecedor).
- Declarar capacidade real por idioma, formato de áudio, duração e caracteres; normalizar para WAV validado; rejeitar sem converter silenciosamente.
- Validar segredos apenas no Render, nunca no Git/cliente. Obter consentimento específico por provedor; aplicar termos de dados do aluno e do responsável.
- Orçamento protegido por conta/organização, controle durável de uso e de concorrência; resposta 429 e timeout previsíveis.
- Testes mockados + teste real com frases fictícias; auditoria do Deep; aprovação de merge e deploy do fundador.
- O foco prioritário permanece: corrigir voz percebida, chat com erro e persistência, concluir a sondagem aprovada, e implementar o Stripe/pagamento **sem expandir o escopo**.

## Critério econômico para 100 pagantes
Os preços por caractere **não são orçamento completo**: somar chat LLM, ASR, voz, armazenamento, rede, taxas Stripe, chargebacks e suporte. As cotas grátis de testes não constituem infraestrutura comercial confiável. Antes do paywall, definir um limite de minutos/caracteres por assinatura e calcular a margem com dados reais de uso; não vender voz ilimitada por US$9,90 sem esse cálculo.
