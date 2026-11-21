# Lingua — plano de produto e implementação

## Escopo aprovado

Construir a primeira versão navegável de um tutor de inglês para adultos que preserve um currículo comum, permita caminhos individuais e deixe pronta uma fronteira de integração para o motor CSLE. Enquanto o motor não está acoplado, o aplicativo usa uma implementação demonstrativa local, claramente marcada como simulação.

O produto deve ser ativo, não apenas reativo: apresentar o próximo passo, sugerir uma rota e oferecer explorações com saída e retorno. A autonomia do estudante permanece explícita: pausar, encerrar, corrigir preferências e desativar personalização. Conteúdo externo como vídeos e episódios entra como ponto de exploração, não como evidência automática de domínio.

O repositório `looksai/last-course-app` é apenas referência histórica de stack e de algumas ideias de produto. Gamificação, rede social, chat estilo MSN e mensagens temporárias não fazem parte do núcleo desta versão. O foco é aprendizagem e governança pedagógica, sem mecânicas de retenção que possam competir com autonomia ou evidência.

## Arquitetura de implementação

- **Frontend:** React + TypeScript + Tailwind v4 no starter `web-db-user`.
- **Estado de demonstração:** estado local em React para tornar o protótipo navegável sem depender do motor ou de APIs externas.
- **Contrato CSLE:** `client/src/lib/csle-contract.ts` define tipos de entrada, ações elegíveis, limites e registros auditáveis. `mock-csle.ts` implementa uma política substituível que retorna uma âncora, uma prática e uma exploração opcional sem possuir autoridade sobre critérios de domínio.
- **Persistência futura:** servidor, autenticação e banco já foram habilitados no projeto. O próximo passo de produção é mover perfil, currículo, eventos e evidências para tabelas próprias; nenhuma evidência demonstrativa atual deve ser tratada como dado de pesquisa ou certificação.
- **Rotas:** a primeira entrega concentra o MVP em `/`. O manifest de rotas registra `/` e `/404`; a navegação interna preserva contexto sem exigir várias rotas até a validação do fluxo.

## Estrutura de pastas

- `client/src/App.tsx`: composição do shell e boundary de erro.
- `client/src/pages/Home.tsx`: experiência principal com dashboard, lição, exploração e evidências.
- `client/src/components/ReadingLab.tsx`: leitura contextual com vocabulário clicável e compreensão formativa.
- O laboratório usa `speechSynthesis` e `MediaRecorder` do navegador como camada provisória; Whisper/whisper.cpp entram depois por um adaptador de transcrição, sem alterar a UX.
- `client/src/lib/csle-contract.ts`: contrato de integração e mock do orquestrador.
- `client/src/lib/speech-contract.ts`: contrato de submissão, transcrição, análise e evidência de fala, sem autoridade automática.
- `client/src/lib/speech-adapter.ts`: implementação demonstrativa substituível por Whisper/whisper.cpp; retorna incerteza alta e nunca certifica domínio.
- `server/routers.ts`: mutation autenticada `speech.transcribe` envia o áudio ao endpoint Speech da plataforma e devolve apenas segmentos normalizados para revisão.
- A UI só cria uma `SpeechObservationCandidate` depois que o estudante revisa e confirma o texto; análise, evidência e decisão continuam separadas.
- `client/src/index.css`: tokens visuais, responsividade e componentes de interface.
- `server/`, `drizzle/`: infraestrutura inicial preparada para autenticação e persistência futura.
- `public/manus-routes.json`: declaração das páginas navegáveis para o ambiente Manus.

## Design

### Estilos candidatos

- **Estúdio editorial de aprendizagem — 0,06:** fundo papel, tipografia serifada nos títulos, acentos teal/coral, módulos assimétricos e leitura em camadas.
- **SaaS azul genérico — 0,04:** cards centralizados, azul dominante e hierarquia corporativa.
- **Caderno técnico noturno — 0,08:** fundo escuro, neon, painéis densos e foco em telemetria.

### Escolha: Estúdio editorial de aprendizagem

- **Movimento:** editorial contemporâneo + oficina de aprendizagem, com contraste entre serif display e sans funcional.
- **Princípios:** clareza antes de gamificação; evidência antes de promessa; convite à curiosidade com retorno visível; autonomia sem abandono.
- **Filosofia de cor:** fundo branco para leitura direta, com superfícies secundárias azul muito claro e a paleta azul do tema original do `last-course-app` reservada à navegação, ações e progresso. O coral queimado permanece apenas para chamar atenção ou marcar hipótese, sem parecer alerta clínico.
- **Layout:** shell com rail lateral estreito e tela de leitura em duas colunas; o conteúdo principal começa em uma faixa de contexto e se abre para cartões de decisão, evitando dashboard simétrico genérico.
- **Assinaturas:** linha de progresso como trilho de currículo; etiquetas de estado de evidência; cartão “o próximo passo” com voz ativa; rótulos de retorno à âncora.
- **Interação:** toda sugestão do sistema apresenta motivo, nível de evidência e alternativa. Ações de exploração sempre oferecem pausar, encerrar ou retornar.
- **Animação:** transições curtas de 180–240ms; progresso cresce suavemente; nenhum loop automático, confete ou urgência artificial.
- **Tipografia:** `DM Sans` para interface e leitura; `Fraunces` para títulos e frases-âncora; fallback sans/serif local para resiliência.
- **Essência:** um tutor de inglês ativo que organiza o próximo passo sem tomar o caminho do estudante. Personalidade: atento, honesto, curioso.
- **Voz:** “Vamos testar isso em um contexto novo.” / “Você pode explorar, pausar ou voltar — o caminho continua salvo.”
- **Marca:** wordmark `lingua/` em minúsculas, com a barra como trilho de progresso e um ponto teal indicando a próxima âncora.
- **Cor proprietária:** teal `#087F7B`, aplicado em trilhos, ações primárias e marcador de âncora.

## Dados e limites pedagógicos do MVP

O protótipo separa reconhecimento, compreensão, recuperação autônoma, aplicação e transferência. Mostra “hipótese”, “simulado” e “implementado” em vez de chamar tudo de validado. Não diagnostica, não certifica, não promete fluência e não transforma um acerto único em domínio. O futuro avaliador deverá receber apenas observações autorizadas e retornar propostas elegíveis; o aplicativo continua dono do consentimento, dos limites e da apresentação ao estudante.

## Decisões incorporadas da recomendação técnica

- **Item de conhecimento como centro:** palavras e frases serão entidades reutilizáveis, independentes da lição. O currículo cria contexto e âncoras, mas revisão, vocabulário salvo, áudio, frases e observações apontam para o item de conhecimento.
- **SRS como serviço de aprendizagem:** implementar SM-2/SM-2+ atrás de uma camada de serviço, com estados novo, aprendendo, revisão e reaprendizagem, quatro qualidades (`again`, `hard`, `good`, `easy`) e prévia do próximo intervalo. A implementação inicial pode usar estado local, mas o contrato já deve permitir persistência central e sincronização futura.
- **Shadowing como output opcional:** aproveitar `MediaRecorder`, revisão humana e transcrição já existentes para comparação A/B entre áudio original e tentativa. O feedback será referência formativa, nunca nota automática; permissão negada ou ASR incerto não bloqueiam a prática.
- **Quatro fios no conteúdo:** cada atividade será marcada como input significativo, output significativo, foco na forma ou fluência, evitando reduzir todo o produto a múltipla escolha.
- **Arquitetura:** manter React + Express/tRPC + Drizzle/MySQL já entregues. A separação equivalente será `router/controller → service → repository`, sem reescrever o projeto em Spring Boot ou obrigar um segundo cliente neste momento.
- **Áudio e TTS:** preferir fontes abertas auditadas e `speechSynthesis` como fallback imediato. Não criar dependência obrigatória de Google TTS nem sugerir clonagem de vozes comunitárias.
- **Gamificação:** não incorporar XP, ranking, corações ou streaks no núcleo, pois o escopo aprovado prioriza autonomia, input massivo e evidências honestas.
- **Offline:** preparar contratos de sincronização e cache depois da persistência do vocabulário e dos review logs; não fingir que o protótipo local já é sincronização multi-dispositivo.
