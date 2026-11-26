# Academy Beta — retomada visual PR #105

## Revisão real das telas internas — correções de QA e contraste

Head f76ee33: P0 45736869174, MySQL 45736869131 e public live 45736869125 success; Chromium 45736869202 failure. Head ae42cfa, Chromium 45736645594, log confirmou que 13 cenários iniciais passaram; clique de navegação do aluno em 375px bloqueado pelo chat proativo aberto (comportamento existente). Corrigido teste 9aa9f96: captura tutor, minimiza via botão real, verifica fechamento, navega nas demais views. 11b8fb1 captura somente viewport do tutor para não misturar scroll da página subjacente. Não desativar saudação proativa nem forçar clique.

Artefato parcial [15079496304](https://github.com/looksai/Lingua/actions/runs/45736645594/artifacts/15079496304) baixado, 16 PNG. Inspecionados login 1440/375, demo, onboarding, diagnóstico e tutor 375. Identidade coerente, mas títulos brancos sobre trechos claros da foto no onboarding/login mobile; f93314f melhora contraste com gradiente localizado. Home aprovada intocada. Novas correções aguardam CI; sem publicação prematura. Render ainda no 9733224. Comunidade funcional não entregue.

---

## Expansão visual empresarial e eventos

Base ae42cfa: P0 45736645610, MySQL 45736645576 e Public live browser laboratory 45736645571 confirmados success. Chromium 45736645594 ainda in_progress na última consulta.

Aplicado o design oficial ao PartnerDashboard (f22ec23) e PublicLivePreview (8eb6321), com estilos compartilhados (f29d8de): cabeçalho com logo original, azul-marinho/dourado, fotografia institucional do kit, cartões, formulários, estados de eventos e sala de espera. Nenhuma transmissão de vídeo foi implementada ou liberada. Preservadas verificações de sessão, papel, convite, visibilidade e mutações existentes.

CI expandido para disparar por alterações nas páginas internas (dea91a1), adicionar capturas sintéticas de painel empresarial e eventos em 375/1440 px (b77d47a), ativar flags das rotas SOMENTE no build isolado de testes (1ace5cb). Total esperado 22 cenários Academy, não confirmar como executados ainda. Home homologada permanece intocada. Comunidade ainda não possui página funcional homologada; não anunciar como entregue.

Prévia Render continua no commit 9733224, sem banco, sem APIs externas configuradas, sem liberação de cadastro. Próximo passo: verificar CI do head, baixar capturas, corrigir regressões antes de publicar nova revisão no serviço visual existente.

---

## Home homologada pelo fundador — expansão da identidade visual

Em 25/11/2026, após acessar a prévia publicada, o fundador aprovou a home ("ta otimo") e determinou manter o padrão em todas as páginas. Não alterar a composição homologada sem nova evidência.

Novo sistema de interiores: academy-interior.css, escopado para não modificar landing; azul-marinho, dourado, fundo creme/azul-claro, tipografia sans-serif, logo original, cartões arredondados, foco visível e fotografia do kit em contextos de entrada. Aplicado a login/cadastro por convite, onboarding e triagem, painel e navegação do estudante, leitura/revisão/configurações, chat do tutor, demonstração de seis views, carregamento, falhas e 404 em português. Mantidas as mutações, consentimentos, limites e regras pedagógicas existentes. Nenhum acesso novo liberado.

Commits 2b37d28, 280c581, ddbdb0a, eda8e1a, 9e91bf0, 229e661, 61b4ace, cd07b74, 7e4f9a5, 5ed8c9f, 8857c70. Chromium expandido para fixtures de aluno sintético, sem APIs externas nem banco. Ainda não confirmar execução do CI ou fidelidade das novas capturas. Páginas empresariais e lives atrás de flags permanecem para próxima etapa; preservar bloqueios. Prévia Render continua no commit 9733224, auto-deploy desligado; somente publicar nova revisão após CI/inspeção. Não conectar banco nem liberar inscrição na prévia.

---

## Prévia visual publicada — 25/11/2026 (horário de Brasília)

Commit implantado: 973322483607e3be4a17b59a028e6fc73a85c2ab. P0 45734119043, Chromium 45734119023, laboratório MySQL 45734119016 aprovados.
Render: serviço separado gratuito lingua-academy-visual-preview, srv-dc3og7rl550s73f3jsh0, branch feat/academy-beta-design, auto-deploy desativado. URL https://lingua-academy-visual-preview.onrender.com.
Primeiro deploy dep-dc3og83l550s73f3jt7g falhou por EROFS ao instalar pnpm globalmente. Configuração NPM_CONFIG_PREFIX=/tmp/lingua-pnpm e PNPM_VERSION=10.18.0 aplicada. Segundo deploy dep-dc3oj5ec6qcc73beisjg confirmado Live pelo Render às 01:22:39 UTC de 26/11 (22:22:39 BRT de 25/11).
Prévia sem conexão de banco configurada, cadastro fechado, tutor e módulos experimentais desativados; não é ambiente de aprendizagem funcional. Staging original preservado. PR permanece draft, sem merge. A confirmação Live não substitui teste HTTP externo nem homologação visual do fundador. Próximo passo: verificar acesso no navegador e obter feedback visual sobre a home publicada antes de liberar a Academy.
 
---

## Checkpoint de homologação visual — 569f1af e ajustes finais

CI confirmado no head 569f1af: P0 [45733667972](https://github.com/looksai/Lingua/actions/runs/45733667972), MySQL [45733667922](https://github.com/looksai/Lingua/actions/runs/45733667922) e Chromium [45733668069](https://github.com/looksai/Lingua/actions/runs/45733668069) aprovados. PR draft, mergeable. Artefato [15077868034](https://github.com/looksai/Lingua/actions/runs/45733668069/artifacts/15077868034) baixado; capturas reais de 1672, 1024, 375 e 320 examinadas. Layout desktop preserva fundo fotográfico, cenário internacional, quatro cards, faixa empresarial e rodapé; em 1024 e abaixo, texto/foto separados intencionalmente para legibilidade. Diferenças residuais em relação ao original decorrem especialmente da fotografia limpa regenerada e da omissão de métricas empresariais fictícias. Não afirmar identidade pixel a pixel.

Problema restante observado: aviso de admissão sobre a fotografia/livros com contraste insuficiente; menu 320 quebrava de maneira irregular. bca1e80 corrige aviso, gradiente/fade e menu compacto; 4a50a99 esclarece rótulo fictício do cartão. CI e renderização desses dois commits ainda não confirmados. Após a confirmação, apresentar a captura final ao fundador para decisão visual, sem prolongar alterações cosméticas sem evidência. Sem merge/deploy ou mudanças no banco.

---

## Checkpoint visual 1672px — referência do fundador

Head 31f7a05: P0 45733164995, MySQL 45733164911, Chromium 45733165900 aprovados; PR draft e mergeable. Artefato [15078036419](https://github.com/looksai/Lingua/actions/runs/45733165900/artifacts/15078036419) baixado e inspecionado. Captura desktop 1672 × 942; referência 1672 × 941. Os quatro cards e o banner ficaram próximos da posição do mockup. A fotografia do kit continua sendo uma reconstrução, não a camada exata do original. Diferenças observadas: livros e planta parcialmente ocultos pelo gradiente, título mais estreito, fotografia mais baixa, navegação sobre retrato em 1024. Mobile 375 legível com seções empilhadas.

Novos commits: 4ebffc2 (texto e quebra de título do banner); e7d928e (gradiente com fade vertical, proporção da foto, tipografia, enquadramento, layout separado até 1100); a215d94 (regressão Chromium para layout intermediário). Últimas mudanças não renderizadas/validadas neste momento. Comparar novo artefato à referência antes de merge/deploy. Indicadores empresariais fictícios continuam omitidos. Não avançar outros módulos até homologação visual.

---

## Revisão visual com capturas reais — novo checkpoint

Head 812e0df: P0 45731835371, MySQL 45731835255 e Chromium 45731835333 aprovados; PR draft e mergeable. Artefato 15077201329 baixado e capturas de 1440, 768 e 375 inspecionadas. Desktop recuperou a cabeça, menu e cartão, mas mesa/livros ainda cortados, composição alta e texto sobreposto ao fundo. Tablet apresentava sobreposição de texto e rodapé; mobile 375 manteve estrutura legível.

Correções posteriores: e10fc60 (calibração do hero desktop, fundo sob cards, maior visibilidade da mesa e proporções do banner), cdff8ab (layout empilhado até 950px e correção intermediária/rodapé), 4946cb1 (Chromium passa a cobrir 320/375/768/1024/1440/1672 e verifica limites geométricos e ausência de overlay em telas estreitas). O ajuste de escala vertical da fotografia é uma escolha de implementação para aproximar o mockup, não garantia de identidade fotográfica.

Aguardar CI do novo head, baixar novo artefato e comparar renderização com a imagem aprovada. Ainda não há aprovação visual do fundador, merge ou deploy. Prioridade continua exclusivamente fidelidade da home.

---

## Correção visual prioritária — referência reafirmada pelo fundador

A imagem aprovada é o layout completo da home, não mera inspiração. O fundador reafirmou em 25/11 que o fundo e composição devem permanecer o mais próximos possível do mockup. O kit contém uma fotografia limpa regenerada (1672 × 941), não a camada original do raster. Não substituir por outro conceito.

A captura anterior landing-1440.png, artefato 15075544965, foi baixada e inspecionada: cabeça parcialmente cortada no topo, título/texto sobrepostos à fotografia e navegação incompleta. CI verde não era homologação visual.

Correções realizadas: efb4ddf (estrutura, quebras do título, navegação, avião/rota, cartão ilustrativo e ícones de rodapé), ef0cc5a (CTA de cadastro), f3c5f1f (enquadramento, proporções, detalhes dourados e responsividade), 517be9a (aviso explícito de jornada fictícia e destino do CTA empresarial). O cartão de 78% é exemplo fictício visível, não proficiência do visitante. Indicadores empresariais fictícios do mockup seguem substituídos por descrições honestas. Planos comerciais continuam indisponíveis; nenhum novo módulo foi ativado.

**Gate visual obrigatório:** baixar as novas capturas Chromium, comparar lado a lado com a referência, corrigir divergências até homologação do fundador. Não avançar para novos módulos comerciais nem considerar a home pronta com base apenas no CI. Nenhum deploy efetuado.

---

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
