# Lingua / Naruto / CSLE — STATUS VIVO PARA RETOMAR O DESENVOLVIMENTO

**Atualização:** 24/11/2026, após integração da PR #68, durante Fase 01.  
**Repositório:** [looksai/Lingua](https://github.com/looksai/Lingua)  
**Fonte de histórico e governança:** [CONTEXTO-MESTRE-LINGUA.md](./CONTEXTO-MESTRE-LINGUA.md).  
**Regra:** em outra conversa, consultar este arquivo, inspecionar **main, PRs, GitHub Actions e Render novamente**; nunca deduzir que o estado abaixo ainda é o mais recente.

## O que está efetivamente integrado

| PR | Resultado | Merge main | Status |
|---|---|---|---|
| [#46](https://github.com/looksai/Lingua/pull/46) | Não pontuar transcrição ASR como resposta digitada nos dois CALs | `5c85293cef0f67acaaf507bf5f57f5230da8aca8` | merged |
| [#47](https://github.com/looksai/Lingua/pull/47) | Controle único de áudio Naruto após #46 | `7c366b513f5695922b8a3a8dc77812d5604b1a83` | merged |
| [#48](https://github.com/looksai/Lingua/pull/48) | Checkpoint de engenharia | ver PR | merged |
| [#49](https://github.com/looksai/Lingua/pull/49) | Isolamento de eventos assíncronos entre conversas | `12fb8eef37924c12d4040ad9746cddc4fdc15f19` | merged |
| [#50](https://github.com/looksai/Lingua/pull/50) | Protocolo de QA com 14 cenários, **não executados no navegador** | ver PR | merged |
| [#51](https://github.com/looksai/Lingua/pull/51) | Testes SSR React da UI de áudio e matriz sintética | ver PR | merged |
| [#52](https://github.com/looksai/Lingua/pull/52) | Diagnóstico que não confunde fases sintéticas com aprendizagem real | ver PR | merged |
| [#53](https://github.com/looksai/Lingua/pull/53) | Adaptador CAL fail-closed com modalidade ausente | ver PR | merged |
| [#54](https://github.com/looksai/Lingua/pull/54) | Receipt autenticado de renderização da tarefa; recuperação de ticket | `efd79155b8bc8abfbb16e92ea09a436aad638786` | merged |
| [#55](https://github.com/looksai/Lingua/pull/55) | Testes multi-turno, duas contas e restart do processo | `2ca853bb557077c767014cd1318c62d29f383c99` | merged |
| [#56](https://github.com/looksai/Lingua/pull/56) | Bookmark local opcional de assunto por até 7 dias; reinício CAL do zero | `6d0034b36258c788682aa91698d2e86c503f3d4d` | merged |
| [#57](https://github.com/looksai/Lingua/pull/57) | Checkpoint vivo e ligação ao contexto-mestre | `edb1be0fb947e00230ab92dd2ea3b180117a856b` | merged, CI verde |
| [#58](https://github.com/looksai/Lingua/pull/58) | Laboratório inerte de gate para observações provisórias consentidas | `184d2f546f7f6ef51553f43fa5a87065f36b91f5` | merged, CI [45356534110](https://github.com/looksai/Lingua/actions/runs/45356534110) verde |
| [#59](https://github.com/looksai/Lingua/pull/59) | Atualização do checkpoint após PR #58 | `4169e28d70888da1772577af748bace36e25381c` | merged, CI [45356797712](https://github.com/looksai/Lingua/actions/runs/45356797712) verde |
| [#60](https://github.com/looksai/Lingua/pull/60) | LAB inerte de consentimento, revogação, concorrência, expiração e deleção | `da3b20ee472cdaebcdad2d077e9e2edfb877a10e` | merged, CI [45357464069](https://github.com/looksai/Lingua/actions/runs/45357464069) verde |
| [#61](https://github.com/looksai/Lingua/pull/61) | Checkpoint vivo de continuidade atualizado | `6d2e08d88883313838c162a2ed2358d428a30507` | merged, CI [45357700403](https://github.com/looksai/Lingua/actions/runs/45357700403) verde |
| [#62](https://github.com/looksai/Lingua/pull/62) | LAB de adaptador transacional simulado, rollback e isolamento por aluno | `37aad8915502bc88859790f92a2f9f3b41dcbe9b` | merged, CI [45358531137](https://github.com/looksai/Lingua/actions/runs/45358531137) verde |
| [#63](https://github.com/looksai/Lingua/pull/63) | Checkpoint posterior ao laboratório transacional | `c815035f4476a61051ab47f79f3cffab019fecff` | merged, CI [45358795325](https://github.com/looksai/Lingua/actions/runs/45358795325) verde |
| [#64](https://github.com/looksai/Lingua/pull/64) | 7 cenários de interação no Chromium headless: card CAL e botões de áudio | `3b16a5adf01f975cf8d4acc06f6a3f3d66e89d3e` | merged, P0 [45359761844](https://github.com/looksai/Lingua/actions/runs/45359761844) + Chromium [45359786556](https://github.com/looksai/Lingua/actions/runs/45359786556) verdes |
| [#65](https://github.com/looksai/Lingua/pull/65) | Checkpoint após os 7 testes de Chromium | `b76fda002bdb7a5dd9bf466369e0aeaecf2bd1fb` | merged, P0 [45360286322](https://github.com/looksai/Lingua/actions/runs/45360286322) verde |
| [#66](https://github.com/looksai/Lingua/pull/66) | 10 testes de integração HTTP Express/tRPC com JWTs válidos e duas contas fictícias | `371a361271646f2975c9fe80fe2c2443de537d47` | merged, P0 [45361539845](https://github.com/looksai/Lingua/actions/runs/45361539845) verde (429 testes) |
| [#67](https://github.com/looksai/Lingua/pull/67) | Checkpoint após suíte HTTP JWT sintética | `0b3d0926291389801301ba2ef2a72d3b5e2dbd8d` | merged, CI [45361842748](https://github.com/looksai/Lingua/actions/runs/45361842748) verde |
| [#68](https://github.com/looksai/Lingua/pull/68) | **6 testes de jornada Chromium → HTTP → CAL → React**, mantendo outros 7 testes Chromium | `a053c7872024babe07b81972db6884152e1a9be2` | merged, P0 [45364963177](https://github.com/looksai/Lingua/actions/runs/45364963177) e browser [45364963187](https://github.com/looksai/Lingua/actions/runs/45364963187) verdes |

PR #45 fechada sem merge: substituída pela #47. CI verde em PRs **não** representa QA interativo humano. Verificar novamente cada execução no GitHub.

## Staging e riscos abertos

- Render staging: https://lingua-p1-staging-le7u.onrender.com , auto-deploy anteriormente desligado.
- Último deploy verificado como **Live** no desenvolvimento anterior: `dep-dc2kh0jrjlhs73d0qchg`, commit `6d0034b36258c788682aa91698d2e86c503f3d4d` (PR #56). **Sempre consultar Render atual antes de alegar versão publicada.**
- **QA de contas reais ainda PENDENTE**: login por senha e consulta de usuários no banco, interface TutorChat completa, Chrome desktop/Android/Safari iOS físicos, voz/TTS/autoplay, microfone/ASR, consentimento persistido, duas abas, cold start e sessões em múltiplas instâncias. **QA de laboratório executado:** #64 7 interações Chromium; #66 10 HTTP tRPC/JWT isolados; **#68 6 fluxos UI React → HTTP → CAL → UI em Chromium real** com contas sintéticas, tudo sem Aiven ou serviços externos. Nenhuma delas comprova eficácia pedagógica ou homologação integral do produto.
- O ciclo CAL é provisório e volátil; a transição até `COMPROVAR` não comprova domínio/CEFR/retention/transferência. Sem SRS/CSLE acoplado. Não escrever evidências oficiais com base em transcrição, autorrelato, LLM ou receipt de DOM.
- **Banco:** MySQL/Aiven + Drizzle; migração 0007 de memória previamente aplicada a staging; **não executar migration 0008**, `db:push` ou alteração produtiva sem revisão específica.
- Stripe PR #32 permanece congelada; não cobrar nem habilitar billing.

## TRABALHO ATUAL E PRÓXIMA SEQUÊNCIA

**Integrado e comprovado:** [PR #68](https://github.com/looksai/Lingua/pull/68), commit `a053c7872024babe07b81972db6884152e1a9be2`. P0 [45364963177](https://github.com/looksai/Lingua/actions/runs/45364963177) **SUCCESS** (TypeScript, Vitest e build) e job Chromium [45364963187](https://github.com/looksai/Lingua/actions/runs/45364963187) **SUCCESS**: `6/6` casos de integração navegador/servidor + `7/7` casos anteriores de componente, total **13 testes Chromium aprovados**.

Implementações integradas:
- `client/qa/http-integration.html`, `client/qa/http-integration.tsx`: **fixture de laboratório** que importa o `TutorCatalogTaskView` de produção, usa `fetch` tRPC real e transmite callbacks de renderização/ACK no mesmo origin.
- `server/cal-browser-http-synthetic.test.ts`: processo Express real na porta efêmera localhost, `enforceSameOrigin`, JWT real (`issueSession`/`verifySession`), `tutorRouter` real, diretório de contas e DB de perfil/LLM totalmente fictícios; servidor React por Vite middleware; Playwright Chromium headless.
- `.github/workflows/browser-qa.yml`: roda nova suíte quando `LINGUA_BROWSER_HTTP_QA=1`, além dos 7 casos anteriores. A suíte é `skip` na execução de testes padrão sem Chromium.
- `docs/QA-BROWSER-HTTP-CAL-SINTETICO-FASE01.md`: matriz e limites.

**Seis cenários do HEAD aprovado:** (1) DOM/viewport e ACK real, digitação e progressão CAL até observação provisória; (2) isolamento de duas contas por cookies e ticket; (3) reload com restauração apenas do ticket autorizado no servidor; (4) mensagem ASR não avaliada; (5) navegador anônimo e Origin malicioso rejeitados; (6) reset explícito invalida ticket velho e não restaura evidências.

**Caveats exigidos:** fixture NÃO é o `TutorChat` inteiro; autenticação da sessão é real mas diretório de usuário é mock e não consulta MySQL/Aiven; canal externo Groq/voz e login por senha não são testados. Um receipt de DOM não é prova de leitura; dicas `typed` do cliente não são atestadas. Observações CAL são voláteis e provisórias, sem certificado, CEFR, learnerEvidence, SRS ou CSLE. Não foi publicado deploy das PRs #57–#68.

**Próxima sequência:** testar as interações do **TutorChat completo**, priorizando gates de consentimento, logout/troca de conta, race assíncrona, reset e áudio, mantendo identidades fictícias e sem banco real. Avaliar se pode ser montado via wrappers/mocks do React Query/tRPC sem recriar comportamento de produção. Depois planejar homologação autenticada em banco descartável com `createContext` real; não executar migration nem usar Aiven.

**Staging:** último deploy comprovado anteriormente como Live: `dep-dc2kh0jrjlhs73d0qchg`, commit #56. Esta sequência #68 fez **zero deploy**; sempre confirmar Render atual antes de informar status da aplicação.

## Documentos e critérios vigentes

- [Constituição pedagógica](./CONSTITUICAO-PEDAGOGICA-v0.1.md)
- [Portões RETOMAR/TRANSFERIR/COMPROVAR](./CAL-PORTOES-RETOMAR-TRANSFERIR-COMPROVAR-FASE01.md)
- [Contrato de renderização de tarefa](./CAL-ACK-RENDER-NAVEGADOR-FASE01.md)
- [QA de isolamento e ASR](./QA-TUTOR-ASR-AUDIO-ISOLAMENTO-FASE01.md)
- [Continuidade opcional do assunto](./CAL-CONTINUIDADE-ASSUNTO-LOCAL-FASE01.md)
- [Laboratório de consentimento e revogação](./CAL-CONSENTIMENTO-REVOGACAO-LAB-V1.md)
- [Desenho de adaptador transacional, rollback e exclusão](./CAL-ADAPTADOR-TRANSACIONAL-LAB-V1.md)
- [QA de navegador isolado](./QA-BROWSER-ISOLADO-NARUTO-FASE01.md)
- [QA HTTP com sessões assinadas sintéticas](./QA-HTTP-SESSAO-SINTETICA-NARUTO-FASE01.md)
- [QA Chromium integrado com HTTP e CAL](./QA-BROWSER-HTTP-CAL-SINTETICO-FASE01.md)

## Protocolo obrigatório para nova conversa

1. Ler `docs/STATUS-ATUAL-DESENVOLVIMENTO.md` **e** `docs/CONTEXTO-MESTRE-LINGUA.md`.
2. Conferir HEAD real da `main`, branches, PRs abertas e CIs; consultar Render se houver alteração de staging.
3. Conferir PR #68 integrada (Chromium + HTTP + CAL, 13/13 browser), PRs #64/#66 e LABs #58/#60/#62. Próxima tarefa: planejar e testar TutorChat completo em laboratório isolado, com autenticação e serviços fictícios; não executar migrations/deploy.
4. Trabalhar em branch, executar `pnpm check`, `pnpm test`, `pnpm build` no CI, revisar diff e só integrar com gates verdes.
5. Atualizar **este mesmo documento** ao concluir cada sequência com PRs, commits, testes, deploy, blockers e próxima ação. Atualizar o CONTEXTO-MESTRE resumidamente quando o marco alterar decisões ou arquitetura.
6. Comunicar ao fundador um balanço sucinto e seguir quando ele escrever `ok`; solicitar opinião apenas em decisões criativas/de produto não resolvidas. Nunca afirmar testes manuais inexistentes.

**Governança:** fundador delegou direção técnica ao GPT; nenhuma mudança pode fabricar resultados pedagógicos, enfraquecer consentimento, ativar cobranças ou usar dados reais de alunos para treinamento. A equipe externa (Deep/Claude) pode reauditar na volta, mas não bloqueia correções técnicas devidamente verificadas.
