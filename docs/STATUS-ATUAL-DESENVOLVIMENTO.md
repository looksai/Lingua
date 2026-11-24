# Lingua / Naruto / CSLE — STATUS VIVO PARA RETOMAR O DESENVOLVIMENTO

**Atualização:** 24/11/2026, após integração da PR #60, durante Fase 01.  
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

PR #45 fechada sem merge: substituída pela #47. CI verde em PRs **não** representa QA interativo humano. Verificar novamente cada execução no GitHub.

## Staging e riscos abertos

- Render staging: https://lingua-p1-staging-le7u.onrender.com , auto-deploy anteriormente desligado.
- Último deploy verificado como **Live** no desenvolvimento anterior: `dep-dc2kh0jrjlhs73d0qchg`, commit `6d0034b36258c788682aa91698d2e86c503f3d4d` (PR #56). **Sempre consultar Render atual antes de alegar versão publicada.**
- **QA autenticado real PENDENTE**: Chrome desktop/Android/Safari iOS, duas contas, TTS/autoplay, permissão de microfone, consentimento, ASR, desligamento, duas abas, reload, cold start.
- O ciclo CAL é provisório e volátil; a transição até `COMPROVAR` não comprova domínio/CEFR/retention/transferência. Sem SRS/CSLE acoplado. Não escrever evidências oficiais com base em transcrição, autorrelato, LLM ou receipt de DOM.
- **Banco:** MySQL/Aiven + Drizzle; migração 0007 de memória previamente aplicada a staging; **não executar migration 0008**, `db:push` ou alteração produtiva sem revisão específica.
- Stripe PR #32 permanece congelada; não cobrar nem habilitar billing.

## TRABALHO ATUAL E PRÓXIMA SEQUÊNCIA

**Concluído e mergeado:** [PR #60](https://github.com/looksai/Lingua/pull/60), merge `da3b20ee472cdaebcdad2d077e9e2edfb877a10e`, CI [45357464069](https://github.com/looksai/Lingua/actions/runs/45357464069) **SUCCESS** (TypeScript + Vitest + build). Esta PR avança a [#58](https://github.com/looksai/Lingua/pull/58) e adiciona:
- `server/learning-evidence-lifecycle-lab.ts`: **simulador puro/inativo**, sem banco/rota, para `grant`, `propose`, `revoke`, `prune`, `erase` com controle de revisão CAS, consentimento vinculado e projeção por allowlist.
- `server/learning-evidence-lifecycle-lab.test.ts`: simulações de corridas de versão, tentativa duplicada/alterada, revogação com resposta tardia, deleção e expiração.
- `docs/CAL-CONSENTIMENTO-REVOGACAO-LAB-V1.md`: contrato de segurança, threat model e portões obrigatórios de transação DB, proveniência, retenção, backup e exclusão.

**FATOS IMPORTANTES:** NÃO existe persistência pedagógica real, nova tabela, migration, rota, gravação Aiven, integração de CAL runtime, CSLE/SRS, cobrança ou certificado. O consentimento da #60 é somente uma estrutura de teste, não um opt-in já oferecido ao aluno. O controle de revisão simula CAS e **não comprova atomicidade de transações reais**. As durações 7 dias (observações) e 30 dias (consentimento) são **parâmetros experimentais não aprovados como política de retenção**. `client_text_claim` não é origem assinada.

**Próxima sequência recomendada:** elaborar o desenho de adapter transacional e o plano de rollback/deleção, sem migration. Em paralelo, priorizar QA autenticado de browser da Fase 01: duas contas, DOM acknowledgement, ASR e microfone/voz, cold start, consentimento e cross-session. Investigar a viabilidade de Playwright test-only em CI, sem credenciais pessoais nem gravações reais. Só avançar para banco após revisar consentimento específico, política de retenção, ameaça de cliente adulterado, isolamento, exigências legais e autorização explícita de produto.

**Staging:** último deploy **verificado** como Live: `dep-dc2kh0jrjlhs73d0qchg`, commit #56. PRs #57–#60 **não** disparam deploy: docs, contrato e simuladores inertes. Verificar Render novamente antes de afirmar versão.

## Documentos e critérios vigentes

- [Constituição pedagógica](./CONSTITUICAO-PEDAGOGICA-v0.1.md)
- [Portões RETOMAR/TRANSFERIR/COMPROVAR](./CAL-PORTOES-RETOMAR-TRANSFERIR-COMPROVAR-FASE01.md)
- [Contrato de renderização de tarefa](./CAL-ACK-RENDER-NAVEGADOR-FASE01.md)
- [QA de isolamento e ASR](./QA-TUTOR-ASR-AUDIO-ISOLAMENTO-FASE01.md)
- [Continuidade opcional do assunto](./CAL-CONTINUIDADE-ASSUNTO-LOCAL-FASE01.md)
- [Laboratório de consentimento e revogação](./CAL-CONSENTIMENTO-REVOGACAO-LAB-V1.md)

## Protocolo obrigatório para nova conversa

1. Ler `docs/STATUS-ATUAL-DESENVOLVIMENTO.md` **e** `docs/CONTEXTO-MESTRE-LINGUA.md`.
2. Conferir HEAD real da `main`, branches, PRs abertas e CIs; consultar Render se houver alteração de staging.
3. Inspecionar os módulos já integrados `server/learning-evidence-lab.ts` e `server/learning-evidence-lifecycle-lab.ts` na `main` e PRs #58/#60. Conferir PRs/branches atuais para não duplicar código. Próxima tarefa: desenho transacional, rollback/deleção e QA real, **sem migrações prematuras**.
4. Trabalhar em branch, executar `pnpm check`, `pnpm test`, `pnpm build` no CI, revisar diff e só integrar com gates verdes.
5. Atualizar **este mesmo documento** ao concluir cada sequência com PRs, commits, testes, deploy, blockers e próxima ação. Atualizar o CONTEXTO-MESTRE resumidamente quando o marco alterar decisões ou arquitetura.
6. Comunicar ao fundador um balanço sucinto e seguir quando ele escrever `ok`; solicitar opinião apenas em decisões criativas/de produto não resolvidas. Nunca afirmar testes manuais inexistentes.

**Governança:** fundador delegou direção técnica ao GPT; nenhuma mudança pode fabricar resultados pedagógicos, enfraquecer consentimento, ativar cobranças ou usar dados reais de alunos para treinamento. A equipe externa (Deep/Claude) pode reauditar na volta, mas não bloqueia correções técnicas devidamente verificadas.
