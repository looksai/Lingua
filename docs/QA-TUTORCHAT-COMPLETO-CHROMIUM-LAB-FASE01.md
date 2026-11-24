# Lingua / Naruto — QA Chromium do TutorChat completo (laboratório isolado)

**Data:** 24/11/2026. **Escopo:** componente `client/src/components/TutorChat.tsx` **verdadeiro e não modificado**, executado dentro do Chromium headless, com os hooks de tRPC de rede substituídos por um stub exclusivamente para QA.

## Como funciona

- `client/qa/tutorchat-full.html` e `client/qa/tutorchat-full.tsx` montam o `TutorChat` original, um perfil fictício e controles sintéticos de troca de conta.
- `tests/browser/vite.tutorchat.qa.config.ts` usa **alias explícito e prioritário** para `@/lib/trpc`: somente neste build Vite de QA ele aponta para `client/qa/tutorchat-trpc-fixture.ts`. O componente e seus filhos conservam o código original; um alias genérico `@/` nunca pode sobrepor essa substituição.
- O stub implementa capacidades da IA, respostas fictícias, falhas de voz e operações assíncronas que podem ser intencionalmente atrasadas. Ele **não** importa cliente de produção, abre HTTP, conecta banco ou chama serviços externos.
- `tests/browser/run-tutorchat-full-qa.mjs` usa Chromium headless, contexto limpo por caso e bloqueia qualquer URL fora de `127.0.0.1:4181`. O workflow usa o mesmo Playwright 1.56.1 e Ubuntu 24.04 verificados nas PRs anteriores.
- O CI P0 padrão mantém a suíte de funções/rotas; o job isolado de navegador executa estes cinco casos **depois** dos 13 casos da PR #68.

## Portões verificados

1. **Aceite específico antes de qualquer envio**: envio sem autorização abre modal; confirmação exige checkbox. Só depois um `reply.mutateAsync` recebe a mensagem com consentimento verdadeiro e modalidade `typed` — ainda alegada pelo cliente, não comprovada.
2. **Resposta atrasada e mudança de conta**: enquanto uma promessa de IA está pendente para a conta A, a interface muda para B; resultado de A chega depois e não deve aparecer nem ser enviado novamente em B.
3. **Revogação com requisição em trânsito**: após desativar envio à IA, a resposta tardia não pode surgir na conversa, e novo envio exige autorização.
4. **Consentimentos independentes de armazenamento**: histórico local e marcador de assunto possuem escolhas separadas; apagar conversa reinicializa a UI e limpa o conteúdo local.
5. **Falha de voz neural**: simula indisponibilidade do serviço; a UI informa fallback/ausência de voz inglesa local sem fabricar áudio.

## Limites de interpretação (críticos)

- Este laboratório testa **o componente completo** e seus efeitos React, mas **não** a implementação real dos hooks tRPC; as dependências de rede são simuladas. Não prova que o `TutorChat` enviou/recebeu dados no servidor de produção.
- A PR #68 cobre, separadamente, navegador + HTTP + CAL verdadeiro **com fixture parcial e contas JWT fictícias**. As duas suítes se complementam e **não** significam que o app inteiro foi homologado ponta a ponta.
- Não testa login real por senha, troca de provedor real, `createContext` consultando MySQL, contas revogadas, transmissão real ao Groq, TTS, dispositivos Android/iOS, gravação/ASR acústica, CEFR ou aprendizagem efetiva.
- A conta/consentimento no laboratório é inteiramente sintético; não modifica banco, migração, Stripe, SRS, CSLE nem staging. Nenhum conteúdo de aluno real deve entrar na fixture.
- O controle de histórico local/assunto não constitui persistência oficial de domínio. A modalidade `typed` continua mera declaração de origem.
- Qualquer falha no CI precisa ser corrigida antes de integrar. Não registrar que foi executada QA manual em dispositivo físico.

## Próxima etapa

Com o teste aprovado, prosseguir com auditoria do `TutorChat` e ligação dos cenários mais importantes ao backend de laboratório; organizar plano de homologação de duas contas de teste reais com browser e banco descartável, sujeito a revisão de segurança e sem alteração de dados de alunos.
