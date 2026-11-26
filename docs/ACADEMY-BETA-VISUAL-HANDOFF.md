# Academy Beta — retomada visual PR #105

## Checkpoint mais recente — laboratório de admissão real

- Head anterior 3475a8419f504e0c478cb6c1453adb3af5246bf5: P0 [45730212961](https://github.com/looksai/Lingua/actions/runs/45730212961), MySQL de parceiros [45730212994](https://github.com/looksai/Lingua/actions/runs/45730212994) e Chromium [45730212952](https://github.com/looksai/Lingua/actions/runs/45730212952) aprovados; mergeable=true, draft.
- Artefato academy-screenshots [15075544965](https://github.com/looksai/Lingua/actions/runs/45730212952/artifacts/15075544965) confirmado no GitHub (expira em 03/12/2026). Conteúdo visual ainda não inspecionado diretamente; comparação humana pendente.
- 8c2b025: novo laboratório HTTP tRPC com createContext real, JWT real, scrypt e persistência MySQL descartável. Sete grupos de verificações: convites inválidos/expirados/cross-origin sem escrita; revogação de convite não usado; corrida de cadastro duplicado e rollback; login com cadastro fechado; isolamento e retomada de onboarding; itens privados e revisão idempotente; memória consentida com exclusão por titular. Nenhuma API externa.
- f7a6206: execução integrada ao workflow MySQL existente, com endereço loopback fixo e guardas; nenhuma migration ou credencial de produção. Execução nova ainda não confirmada.
- Próxima ação: conferir CI deste head, corrigir falhas, revisar capturas e homologar staging com cadastro fechado e limites. Não emitir convites reais antes de gates. Não fazer merge/deploy enquanto a validação pendente não for resolvida.

---

## Checkpoint atual — 25/11/2026 — PR #105 (draft)

CI confirmado no commit b50d1caac7cca83309c10205f81358d28c86c1ad: P0 45729717776 e laboratório MySQL de parceiros 45729717792 aprovados. O laboratório de parceiros não prova admissão do aluno em banco real.

Novo bloco:
- 68396df: orçamento do tutor configurável com tetos conservadores (100 unidades/dia global, 30 por aluno, 2 simultâneas); valores explícitos inválidos fecham o limite; 0 permite interromper chamadas; reserva prévia, falhas contam e retrocesso de relógio não reinicia cota.
- e5a8d35: resposta OpenAI com voz externa reserva duas unidades, conservadoramente. Não equivale a valor monetário nem contagem exata de chamadas/retries.
- 247a107 / 4c91a29: transcrição legada Manus da leitura bloqueada no servidor nos modos invite/closed e refletida na UI. Gravação local e tutor autorizado preservados. Modo open legado permanece fora desse bloqueio, não deve ser usado no piloto.
- 7fb4d58 / 072af80 / c23d213: 5 testes de orçamento e 5 de boundary tRPC de cadastro, com persistência simulada; rejeições e caminho válido antes de banco/fornecedor.
- e68471a / 3636cac: suíte Chromium pública já existente ganha capturas de landing e login em 320/375/768/1440; artefatos sintéticos retidos por sete dias. Não representa comparação visual humana.
- CI do novo bloco não confirmado; PR estava mergeable em 4c91a29. Não houve merge ou deploy.

## Configuração proposta para staging controlado
- ACADEMY_ADMISSION_MODE=closed inicialmente; depois invite somente após homologação; nunca open.
- LINGUA_TUTOR_DAILY_GLOBAL, LINGUA_TUTOR_DAILY_PER_USER, LINGUA_TUTOR_MAX_CONCURRENT podem reduzir os limites padrão. Exemplo inicial de teste: 100/10/2, ainda sujeito a orçamento real do provedor.
- LINGUA_TUTOR_ALLOWED_EMAILS permanece lista explícita, independente da admissão; cadastrar e habilitar IA são decisões diferentes.
- Quota é por processo, reinicia em restart, não é limite financeiro durável. Usar uma instância no piloto, teto/alerta do provedor e monitoramento de custos; não prometer IA ilimitada.
- Não ativar provedor pago, alterar produção, Stripe, banco ou CSLE nesta frente.

## Próxima ação
1. Verificar P0, Chromium e MySQL no head efetivo da PR; corrigir regressões.
2. Revisar as oito capturas da Academy e comparar com o kit aprovado, incluindo contraste, zoom e teclado.
3. Teste de admissão com banco descartável e autenticação real, duplicidade/concorrência, duas contas e isolamento. Não usar Aiven produtivo.
4. Homologar staging, orçamento e jornada completa do aluno, antes de emitir convites reais.

---

## Histórico do primeiro bloco

Kit original recebido em 25/11/2026: Lingua_Kit_Visual_Web_Designer(1).zip (40 entradas), acompanhado do Documento Mestre V2.1. Referência aprovada: 1672 × 941. O hero limpo é regenerado, não camada original; fidelidade pixel a pixel não está demonstrada.

## Integração implementada
- O fundador publicou os oito assets em client/public/academy/. Os oito hashes Git conferem com os bytes do pacote original.
- Landing.tsx utiliza a logo, quatro ícones, edifício e composição pedagógica ilustrativa. CSS utiliza o hero fotográfico e a textura do mapa.
- Login.tsx recebeu a identidade visual da Academy, preservando os procedimentos de autenticação existentes.
- Navegação horizontal, rotas /login e /demo, layout responsivo e foco visível; sem CTAs para módulos indisponíveis ou métricas fictícias na landing.
- server/academy-visual-assets.test.ts contém dez casos de regressão (oito SHA-256 e dois testes de referências/rotas). Ainda não há execução confirmada desses testes.
- Commits: 76a3324 (landing), 19ecb41 (CSS), 9b9daa4 (login), e598575 (CSS login), 4decaee (testes).

## Gates antes de convidar alunos
- CI verde no SHA final. Último CI confirmado anterior à integração dos assets: run 45571520786, commit bb89d4e. PR estava mergeable antes das últimas mudanças; continua draft.
- Homologação visual em navegador real: contraste, teclado, zoom, larguras 320/375/768/1440, assets sem erros e comparação com referência. Não realizada neste bloco.
- Bloqueador funcional identificado em inspeção de server/routers.ts: auth.signUp aceita email e senha e não exige convite. Não confundir parceiro convidado com aluno convidado. Implementar e testar gate de cadastro no servidor, revogação/política de admissão, limites de custo e isolamento antes de abrir a Academy.
- Validar onboarding, tutor, prática, revisão, consentimento, falhas de voz, persistência de sessão e isolamento de duas contas; suporte e rollback, ausência de cobrança involuntária.
- Homologação humana em staging antes de abertura. Não ativar Stripe, CSLE ou produção por este documento.

## Limites
Transferência binária resolvida pelo upload do fundador. Sem merge, deploy ou alteração de banco neste bloco. A implementação de código não equivale a homologação visual ou autorização de lançamento.
