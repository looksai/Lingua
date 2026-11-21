# Lingua — relatório vivo do projeto

> Documento de continuidade para novas sessões, IAs e colaboradores. Deve ser atualizado a cada entrega relevante do aplicativo.

## 1. Visão do produto

O Lingua é um aplicativo de inglês para adultos com tutor ativo, currículo comum e caminhos individuais. A experiência foi construída para organizar o próximo passo sem retirar a autonomia do estudante. O produto privilegia leitura, escuta, recuperação, aplicação, transferência, retenção e evidências honestas.

Ficam fora do núcleo: XP, ranking, streak, corações, bloqueios artificiais, rede social, chat estilo MSN, mensagens temporárias e certificação automática.

## 2. Princípios de governança pedagógica

- Uma revisão SRS agenda um retorno; não prova domínio.
- Um acerto isolado, transcrição, autoavaliação ou conteúdo externo não vira certificação automática.
- Incerteza, consentimento, limites e auditoria ficam fora da autoridade de um futuro motor CSLE.
- O CSLE deverá receber somente observações autorizadas e devolver propostas elegíveis.
- Conteúdo externo é distinguido entre gratuito para acessar e livre para redistribuir.
- Falha de microfone, autenticação, banco ou rede não bloqueia a prática local.

## 3. Arquitetura atual

- Frontend: React 19, TypeScript, Vite e Tailwind CSS v4.
- Backend: Express, tRPC e Node/TypeScript.
- Persistência: Drizzle ORM com MySQL gerenciado.
- Testes: Vitest.
- Conteúdo público: `client/public/content`.
- Contrato CSLE: `client/src/lib/csle-contract.ts`.
- Contrato de fala: `client/src/lib/speech-contract.ts`.
- Especificação SRS: `docs/srs-spec.md`.
- Especificação de shadowing: `docs/shadowing-spec.md`.
- Especificação offline: `docs/offline-sync-spec.md`.
- Cliente tRPC: `client/src/lib/trpc.ts`.
- Rotas principais do produto: navegação interna em `client/src/pages/Home.tsx`.

A separação arquitetural adotada é equivalente a `router/controller → service → repository`: as procedures tRPC protegem a entrada; queries no servidor isolam persistência; contratos compartilhados mantêm o domínio desacoplado.

## 4. Áreas entregues

### Início, Aprender, Explorar e Evidências

O shell principal apresenta currículo, âncora atual, prática, exploração opcional, fontes e painel de evidências. Os estados são marcados como simulados, hipótese ou implementados. A área Evidências conserva retenção, transferência e incerteza como conceitos distintos.

### Laboratório de Leitura

- Texto contextual com palavras clicáveis.
- Vocabulário salvo.
- Síntese de voz do navegador.
- Pergunta de compreensão formativa.
- Gravação local.
- Transcrição autenticada via Whisper.
- Revisão humana editável.
- Criação de `SpeechObservationCandidate` sem conversão automática em domínio.

### Revisar

A área dedicada permite alternar entre itens vencidos e todos os itens salvos. Usa os estados SRS `new`, `learning`, `review` e `relearning`, com respostas `again`, `hard`, `good` e `easy`.

### Shadowing

O Laboratório oferece áudio original LibriSpeech local, transcrição correspondente, atribuição CC BY 4.0, gravação A/B, prática sem microfone e feedback local determinístico sobre duração, pausas e ritmo. A camada remota Whisper é opcional, permanece separada do exercício de shadowing e sua ausência não bloqueia a prática.

## 5. Conteúdo aberto integrado

- CMUdict: 135.166 entradas, pronúncia ARPAbet, licença e hash preservados.
- Tatoeba: amostra textual de 24 frases com IDs, autores, licenças e URLs.
- LibriVox: catálogo local com revisão territorial antes de redistribuição.
- LibriSpeech/OpenSLR SLR12: quatro segmentos WAV locais com transcrição, SHA-256 e licença CC BY 4.0.
- Manifesto: `client/public/content/manifest.json`.
- Plano de integração: `docs/content-integration-plan.md`.

## 6. Itens de conhecimento e SRS

O contrato compartilhado está em `shared/learning.ts`. Cada item tem texto normalizado, tipo, idioma, contexto, fonte, licença e âncoras curriculares. `docs/srs-spec.md` é a fonte da verdade corrigida do SM-2: qualidade 0/3/4/5, EF entre 1,3 e 3, jitter de ±5% com semente por usuário/item, passos de 1 minuto/10 minutos/1 dia, relearning, UTC e teto de 3650 dias. `easy` em itens novos atualiza EF para 2,6 e mantém intervalo fixo de 4 dias; `good` em 10 dias produz 25 dias sem jitter. O SRS permanece como agenda de retorno.

Tabelas atuais:

- `knowledgeItems` — itens compartilhados.
- `userKnowledgeStates` — estado SRS por usuário.
- `reviewLogs` — histórico operacional de revisões.

Procedures protegidas:

- `learning.saveItem`.
- `learning.reviewQueue`.
- `learning.listItems`.
- `learning.removeItem`.
- `learning.history`.
- `learning.review`.

## 7. Sincronização e modo offline

A fila operacional está em `client/src/lib/offline-learning.ts`, com contrato detalhado em `docs/offline-sync-spec.md`. Salvamentos, revisões e remoções que falham são guardados em `localStorage` com tipo, chave local, payload mínimo, identificador de operação e timestamp. A fila é reproduzida em ordem, deduplicada localmente e expira após 30 dias; cada operação é removida somente após confirmação do servidor.

A fila não contém transcrições, autoavaliações, decisões pedagógicas ou dados enviados automaticamente ao CSLE. A reconstrução pura a partir de logs foi implementada para equivalência local. Idempotência server-side, reconstrução persistente com `operationId`, lock entre múltiplas abas e criptografia local ainda precisam de contrato/migração próprios.

## 8. Relatório longitudinal, retenção e exportação auditável

A área Revisar agora possui três camadas adicionais:

1. **Relatório longitudinal:** filtro de 30 dias, 90 dias ou todo o histórico disponível; distribuição das respostas SRS e ritmo por dia. O relatório descreve telemetria da agenda, não proficiência.
2. **Retenção configurável:** marcos de 7, 30 e 90 dias podem ser ativados ou pausados pelo estudante. A configuração é local neste estágio e não altera o estado SRS nem cria evidência.
3. **Exportação auditável:** botão exporta JSON com schema, data, período, plano de retenção, itens, estado SRS, review logs, fontes/licenças disponíveis e limites de interpretação. Transcrições, autoavaliações e decisões CSLE ficam fora do arquivo.

O formato de exportação atual é `lingua.learning-audit.v1`.

## 9. Fronteira futura do CSLE

O motor avaliador ainda não é o proprietário do currículo, do consentimento, da evidência ou da certificação. Antes da integração real, será necessário:

- definir adaptador formal `PedagogicalEngine`;
- validar observações autorizadas;
- preservar incerteza e proveniência;
- registrar auditoria de entrada e saída;
- revisar retenção, transferência e critérios humanos;
- impedir que SRS ou logs operacionais sejam tratados como domínio.

## 10. Histórico de checkpoints publicados

- `ec3a6ce` — fontes abertas.
- `513a585` — catálogo de conteúdo.
- `0682d42` — preview LibriVox.
- `0acfcc2` — previews LibriSpeech.
- `f81222a` — contrato e fundação SRS.
- `9fb6ebb` — vocabulário salvo conectado ao SRS local.
- `bc6b992` — persistência de conhecimento e revisões.
- `bc13654` — Laboratório sincronizado com persistência.
- `89693dd` — área dedicada de revisão.
- `359bff7` — prática de shadowing.
- `0dc8f91` — fila de operações offline.
- `596a453` — análise inicial dos review logs.
- `2f802f0` — relatório longitudinal, retenção configurável e exportação auditável.
- `6dcec63` — checkpoint P0: especificações formais de SRS, shadowing local/remoto e sincronização offline, implementação SM-2 auditável, métricas locais, expiração/deduplicação da fila e testes determinísticos.
- `a3f6d24` — correções normativas do SRS: exemplo `good` 10→25, semente de jitter por usuário/item, promoção `easy`, hard fixo, UTC, itens vencidos, lapses e repetitions.

O próximo checkpoint deve acrescentar seu SHA a esta seção e atualizar “Áreas entregues”, “Sincronização” ou “Fronteira futura” conforme necessário.

## 11. Validação recorrente

Antes de cada checkpoint:

```bash
pnpm check
pnpm test
pnpm build
```

Também executar `git diff --check`, fazer `fetch`, `rebase` de `origin/main` e `push` para `origin/main`. Não fazer force push.

## 12. Próximas etapas abertas

- Adicionar idempotência server-side por `(userId, operationId)` e reconstrução persistente de `userKnowledgeStates` a partir dos `reviewLogs`, com migração e semântica de timestamps.
- Resolver lock/lease entre múltiplas abas, criptografia local e recuperação segura da fila.
- Garantir estratégia de cache/offline para o áudio de referência após nova abertura do aplicativo.
- Tornar plano de retenção persistente entre dispositivos, se consentido.
- Acrescentar relatórios longitudinais com retenção configurável no servidor, se necessário.
- Criar exportação com versão, assinatura e trilha de auditoria mais formal.
- Implementar adaptador CSLE real somente depois da validação dos contratos e dos limites pedagógicos.
