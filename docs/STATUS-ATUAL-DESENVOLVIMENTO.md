# Lingua / Naruto / CSLE — STATUS VIVO PARA RETOMAR O DESENVOLVIMENTO

**Atualização:** 24/11/2026, após integração da PR #66, durante Fase 01.  
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

PR #45 fechada sem merge: substituída pela #47. CI verde em PRs **não** representa QA interativo humano. Verificar novamente cada execução no GitHub.

## Staging e riscos abertos

- Render staging: https://lingua-p1-staging-le7u.onrender.com , auto-deploy anteriormente desligado.
- Último deploy verificado como **Live** no desenvolvimento anterior: `dep-dc2kh0jrjlhs73d0qchg`, commit `6d0034b36258c788682aa91698d2e86c503f3d4d` (PR #56). **Sempre consultar Render atual antes de alegar versão publicada.**
- **QA autenticado real PENDENTE**: login real + consulta de usuários no banco, navegador integrado ao servidor, Chrome desktop/Android/Safari iOS, TTS/autoplay, microfone/ASR, consentimento, duas abas, reload e cold start. **Cobertura isolada:** #64 aprovou 7 interações de componentes em Chromium headless; #66 aprovou 10 integrações HTTP Express/tRPC + JWT real com diretório/IA/banco fictícios. Nenhuma delas comprova a jornada real end-to-end.
- O ciclo CAL é provisório e volátil; a transição até `COMPROVAR` não comprova domínio/CEFR/retention/transferência. Sem SRS/CSLE acoplado. Não escrever evidências oficiais com base em transcrição, autorrelato, LLM ou receipt de DOM.
- **Banco:** MySQL/Aiven + Drizzle; migração 0007 de memória previamente aplicada a staging; **não executar migration 0008**, `db:push` ou alteração produtiva sem revisão específica.
- Stripe PR #32 permanece congelada; não cobrar nem habilitar billing.

## TRABALHO ATUAL E PRÓXIMA SEQUÊNCIA

**Integrado e verificado:** [PR #66](https://github.com/looksai/Lingua/pull/66), merge `371a361271646f2975c9fe80fe2c2443de537d47`, CI [45361539845](https://github.com/looksai/Lingua/actions/runs/45361539845) **SUCCESS**: TypeScript, Vitest **429/429 testes** (inclui **10 testes HTTP novos**), build.

Arquivos:
- `server/cal-http-synthetic-signed-session.test.ts`: abre Express em `127.0.0.1` porta efêmera com o mesmo prefixo público tRPC `tutor.*`; usa `enforceSameOrigin`, `createExpressMiddleware`, `tutorRouter`, `issueSession`/`verifySession` de produção; credenciais de sessão, diretório de contas, perfil de aluno e fornecedor de IA são **sintéticos/mocks**, sem DB.
- `docs/QA-HTTP-SESSAO-SINTETICA-NARUTO-FASE01.md`: descrição de cobertura e limites.

**Cenários verificados via HTTP real**: tickets isolados das contas A/B; JWT ausente, adulterado ou de usuário fora do diretório (401); origem de outro site (403); exercício não pode avançar antes do recibo DOM; ACK/replay; conta B não confirma o ticket de A; ASR não pontua resposta fechada; consentimento de turno recusado; retomada de ticket do mesmo usuário; reset explícito invalida o ticket antigo; schema inválido (400).

**Limites da #66:** o contexto do usuário é **de teste** e não executa `createContext` com lookup MySQL; autenticação de senha, cookie real de navegador, CSRF em navegador, TTS/ASR real, integração da UI com esses endpoints, deploy de múltiplos processos e dispositivos continuam sem homologação. `client_text_claim` ainda não é atestação; não há evidência, domínio, CEFR ou persistência pedagógica oficial.

**PRs #58/#60/#62:** laboratórios de observação, consentimento, concorrência e transação simulada; nenhum escreve no Aiven. Os prazos 7/30 dias são parâmetros de laboratório, não política aprovada. **Próximo passo:** conectar a fixture Chromium #64 ao servidor HTTP sintético testado na #66, verificando UI→HTTP→tRPC→CAL→UI com cookies fictícios por conta, sem login real, database ou serviço de IA. Planejar QA separado de `createContext` + autenticação verdadeira em banco descartável, após revisão da segurança. Não executar migration.

**Staging:** último deploy comprovadamente Live no checkpoint anterior: `dep-dc2kh0jrjlhs73d0qchg`, commit #56. PRs #57–#66 não foram publicadas; #66 é somente teste e documentação. Conferir Render antes de afirmar status ao vivo.

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

## Protocolo obrigatório para nova conversa

1. Ler `docs/STATUS-ATUAL-DESENVOLVIMENTO.md` **e** `docs/CONTEXTO-MESTRE-LINGUA.md`.
2. Conferir HEAD real da `main`, branches, PRs abertas e CIs; consultar Render se houver alteração de staging.
3. Conferir as PRs #64 (Chromium), #66 (HTTP JWT sintético) e #58/#60/#62 (laboratório inerte). Próxima tarefa: unir browser e HTTP sintéticos numa jornada isolada sem dados/serviços reais; não executar migrations/deploy.
4. Trabalhar em branch, executar `pnpm check`, `pnpm test`, `pnpm build` no CI, revisar diff e só integrar com gates verdes.
5. Atualizar **este mesmo documento** ao concluir cada sequência com PRs, commits, testes, deploy, blockers e próxima ação. Atualizar o CONTEXTO-MESTRE resumidamente quando o marco alterar decisões ou arquitetura.
6. Comunicar ao fundador um balanço sucinto e seguir quando ele escrever `ok`; solicitar opinião apenas em decisões criativas/de produto não resolvidas. Nunca afirmar testes manuais inexistentes.

**Governança:** fundador delegou direção técnica ao GPT; nenhuma mudança pode fabricar resultados pedagógicos, enfraquecer consentimento, ativar cobranças ou usar dados reais de alunos para treinamento. A equipe externa (Deep/Claude) pode reauditar na volta, mas não bloqueia correções técnicas devidamente verificadas.
