# Lingua — Planejamento P1 (proposta para aprovação)

**Status:** SOMENTE PLANEJAMENTO. Nenhuma feature, integração CSLE, mudança de produção ou deploy está autorizada neste documento.  
**Base:** `main` após merge P0, commit `6d4271a59d8258e86874cc1c9d3e2f98c5a1adb4` (21/11/2026).  
**Decisores:** fundador + auditor Deep. **CSLE e Lingua permanecem repositórios e responsabilidades independentes.**

## 0. Pré-requisito: proteção da `main`

**Bloqueio verificado em 21/11/2026:** `main.protected=false`. A API de Rulesets retornou `403: Upgrade to GitHub Pro or make this repository public`; a API de branch protection retornou `403: Resource not accessible by integration`. O repositório é privado e a conta proprietária é pessoal (`looksai`). A conexão atual do GPT não oferece escrita de Rulesets. **A proteção NÃO foi ativada. Não tornar o repositório público.**

**Ação manual do fundador, quando desejar habilitar regras de fato:** verificar GitHub Pro na conta proprietária; em `looksai/Lingua → Settings → Rules → Rulesets → New branch ruleset`, definir `main` como alvo exato e enforcement **Active**. Habilitar **Require a pull request before merging** e **Block force pushes** (além de bloquear deleção da branch); revisar permissões de bypass para não permitir exceção silenciosa dos agentes. Caso a interface ofereça nomes ligeiramente diferentes, confirmar o efeito real. Os status checks obrigatórios só devem ser escolhidos após verificar que esses mesmos jobs rodam em PRs, sem criar um bloqueio impossível de satisfazer. Confirmar depois via painel e API que a branch está protegida. Aplicar também ao CSLE em etapa específica, mediante autorização.

Enquanto não houver proteção efetiva: nenhum push direto na `main`; branches + PRs somente, por **acordo operacional, não por mecanismo técnico**. Nenhum merge de implementação P1 antes de ativar as regras e receber aprovação.

## 1. Concorrência entre abas (P1.1)

**Problema atual:** `client/src/lib/offline-learning.ts` usa `inFlightReplays` em memória da aba (não bloqueia outras abas); `docs/offline-sync-spec.md` reconhece a ausência de lock. Dois contextos podem reproduzir a mesma fila, ainda que reviews no servidor tenham idempotência.

**Proposta:** uma única aba por `userId` realiza o replay em cada origem, usando **Web Locks API** (`navigator.locks.request`, lock exclusivo por usuário) em navegadores compatíveis; `BroadcastChannel` e eventos `storage` só propagam mudanças de estado/contagem e solicitação de replay, não substituem lock. Verificar identidade autenticada antes de enviar cada operação e ao receber ACK; interromper ao trocar usuário, perder autorização ou detectar uma operação sem ID confirmado. Não mostrar “sincronizado” sem ACK e fila vazia. Política de fallback quando Web Locks indisponível: **não iniciar replays concorrentes de forma insegura**; avaliar coordenação por backend ou modo de uma aba explicitamente sinalizado. Não tratar lease simples em localStorage como lock atômico garantido.

**Testes de aceitação:** duas abas iniciam replay simultaneamente; ACK perdido/retry; troca A→B; aba fechada/crash; operação com ID ausente; armazenamento indisponível; sincronização retomada sem perdas e sem falso “synced”. Preservar `operationId` e a regra SRS versionada.

## 2. Preview na nuvem e QA manual (P1.2)

**Resposta:** sim, um link de preview é viável sem `pnpm dev` no notebook, **mas ainda não há URL de preview criada**. O Lingua é React/Vite **mais** Express/tRPC, OAuth e MySQL; páginas estáticas não validam autenticação e sincronização real.

**Candidato principal:** ambiente **staging** em um serviço Node.js de backend completo, por exemplo **Render Web Service**, a partir de branch/PR de teste do repositório privado; build `pnpm install --frozen-lockfile && pnpm build`, start `pnpm start`, `/api/health` e `PORT` fornecidos pelo host. Validar compatibilidade da autenticação Manus/OAuth fora da plataforma original, callbacks e cookies seguros; manter secrets somente no host. Conectar exclusivamente **MySQL de homologação**, com TLS/certificado verificado, credenciais mínimas e dados sintéticos. Nunca apontar o preview para produção. Plano gratuito e capacidade/tempo de despertar deverão ser verificados antes de uso; não prometer gratuidade contínua nem desempenho. O fundador só precisará abrir a URL no Chrome/Edge. O vínculo com o provedor exige a autorização da conta do fundador. Nenhuma publicação/conta/URL está provisionada neste P1.

**Alternativa:** Vercel para UI preview, sujeito a adaptação do Express/autenticação; **GitHub Pages é apenas estático** e ainda sujeito às restrições de plano para repo privado. Uma UI estática/mocks serve só à apresentação visual, **não** à validação funcional P0/P1.

**Roteiro QA:** A autenticado → desconectar rede → enfileirar `save/review/remove` → trocar para B → abrir segunda aba → reconectar → confirmar isolamento, um único replay e ACK real; repetir após recarregar/navegar, logout e interrupção inesperada. Registrar evidências sem dados pessoais, com resultado por cenário e ambiente. Não considerar QA concluído apenas porque a build está verde.

## 3. Preparação do contrato universal CSLE (P1.3 — somente desenho)

**Autoridades:** Lingua mantém currículo, identidade, consentimento, registros/evidências oficiais e certificação; SRS só agenda revisões. CSLE propõe estratégias, trajetórias e candidatos a evidência **sem alterar sozinho** o patrimônio pedagógico ou declarar domínio.

**Proposta de adaptador `PedagogicalEngine`:** contrato versionado e tipado **no backend do Lingua**, usando apenas observações e contexto curricular **explicitamente autorizados**. Entradas propostas: `tenant/app/learner/session` opacos, versão/fingerprint do currículo, observações autorizadas, finalidade/escopo de consentimento e sequência esperada. Saídas propostas: sugestões pedagógicas explicáveis com proveniência, versão da regra, validade e estado `proposed` (nunca confirmação/certificação). Linguagem e campos definitivos devem ser confrontados com os contratos do CSLE, especialmente `APP-INTEGRATION-v0.2.md` e `UNIVERSAL-INTEGRATION.md`. Segredos/credenciais apenas no servidor; `uncertain` de transporte **não** dispara retry automático, avanço ou cobrança presumidos. Rejeições e revogações bloqueiam processamento e promovem reconciliação autorizada.

**Sequência de trabalho após aprovação:** (a) matriz campo→autoridade e consentimento; (b) schemas/interfaces + threat model; (c) adaptador simulado/read-only com dados sintéticos e testes de contrato, isolado em branch; (d) revisão Deep/fundador e medição; (e) só depois considerar integração real. Dados autorizados para operação **não** autorizam treinamento/monetização; uso secundário exige consentimento/governança específicos. Não integrar CSLE agora.

## 4. Gates para iniciar implementação

1. Ruleset **ativa e verificada** na `main` (requer ação no plano/configuração do GitHub).
2. Aprovação explícita de fundador e Deep para este plano, prioridades e critérios.
3. Definição de ambiente isolado de staging, autenticação e custos; **sem dados reais** antes de controles adequados.
4. PRs separados para lock entre abas, QA/preview e contrato CSLE, com testes, revisão independente e rollback.

**Fontes internas consultadas:** `Lingua/client/src/lib/offline-learning.ts`, `Lingua/docs/offline-sync-spec.md`, `Lingua/server/_core/index.ts`, `Lingua/package.json`; `CSLE-Engine/APP-INTEGRATION-v0.2.md`, `CSLE-Engine/UNIVERSAL-INTEGRATION.md`, `CSLE-Engine/GIT-SNAPSHOT-README.md`.

**Referências externas (revisadas em 21/11/2026):**  
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository  
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches  
- https://render.com/docs/free  
- https://render.com/docs/web-services  
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
