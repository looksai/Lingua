# Lingua / Naruto / CSLE — STATUS VIVO PARA RETOMAR O DESENVOLVIMENTO

**Atualização:** 24/11/2026, após integração da PR #62, durante Fase 01.  
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

PR #45 fechada sem merge: substituída pela #47. CI verde em PRs **não** representa QA interativo humano. Verificar novamente cada execução no GitHub.

## Staging e riscos abertos

- Render staging: https://lingua-p1-staging-le7u.onrender.com , auto-deploy anteriormente desligado.
- Último deploy verificado como **Live** no desenvolvimento anterior: `dep-dc2kh0jrjlhs73d0qchg`, commit `6d0034b36258c788682aa91698d2e86c503f3d4d` (PR #56). **Sempre consultar Render atual antes de alegar versão publicada.**
- **QA autenticado real PENDENTE**: Chrome desktop/Android/Safari iOS, duas contas, TTS/autoplay, permissão de microfone, consentimento, ASR, desligamento, duas abas, reload, cold start.
- O ciclo CAL é provisório e volátil; a transição até `COMPROVAR` não comprova domínio/CEFR/retention/transferência. Sem SRS/CSLE acoplado. Não escrever evidências oficiais com base em transcrição, autorrelato, LLM ou receipt de DOM.
- **Banco:** MySQL/Aiven + Drizzle; migração 0007 de memória previamente aplicada a staging; **não executar migration 0008**, `db:push` ou alteração produtiva sem revisão específica.
- Stripe PR #32 permanece congelada; não cobrar nem habilitar billing.

## TRABALHO ATUAL E PRÓXIMA SEQUÊNCIA

**Entregue e mergeado:** [PR #62](https://github.com/looksai/Lingua/pull/62), commit `37aad8915502bc88859790f92a2f9f3b41dcbe9b`, CI [45358531137](https://github.com/looksai/Lingua/actions/runs/45358531137) SUCCESS (TypeScript + Vitest + build). Complementa #58 e #60 com:
- `server/learning-evidence-transaction-adapter-lab.ts`: **test double** com Map em memória e fila por aluno; simula serialização de transações, clonagem de snapshots, lock, rollback antes do commit e rejeição de operações com revisão obsoleta.
- `server/learning-evidence-transaction-adapter-lab.test.ts`: 12 casos, cobrindo propostas simultâneas, revogação durante tentativa pendente, exclusão com falha simulada, recuperação de lock, idempotência, isolamento de contas e ausência de consentimento.
- `docs/CAL-ADAPTADOR-TRANSACIONAL-LAB-V1.md`: desenho de banco futuro, transações e índices únicos, plano de rollback/deleção, reconciliação de backups e portões SQL-01–SQL-10.

**LIMITES:** isto NÃO é transação real de MySQL, não faz persistência, autenticação HTTP, migration, registro oficial ou exclusão verdadeira de dados. Simulação de fila por processo não cobre múltiplos serviços Render ou DB. Consentimento e retenção definitivos ainda dependem de decisões de produto/privacidade; os parâmetros 7/30 dias dos laboratórios são **hipóteses técnicas**, não política aprovada. `client_text_claim` não é origem assinada. O código está inerte: não há endpoint e não há deploy referente às PRs #57–#62.

**Próxima sequência:** criar uma suíte automatizada de navegador em ambiente de teste sem credenciais reais (investigar Playwright já disponível/dependências; teste de renderização/sem backend real primeiro). Em paralelo, revisar threat model do futuro adaptador MySQL e a prova de exclusão/backup; **não** criar migration ou fazer `db:push` antes das decisões de dados. Segue pendente QA autenticado real de duas contas, microfone/ASR/autoplay, consentimento, render ACK, cold start, RETOMAR/TRANSFERIR/COMPROVAR e comparador pedagógico.

**Staging:** último deploy verificado Live: `dep-dc2kh0jrjlhs73d0qchg`, commit #56. Como #57–#62 contêm apenas documentos/laboratórios inertes, não foi feito deploy nessas etapas. Consultar Render antes de declarar status atual.

## Documentos e critérios vigentes

- [Constituição pedagógica](./CONSTITUICAO-PEDAGOGICA-v0.1.md)
- [Portões RETOMAR/TRANSFERIR/COMPROVAR](./CAL-PORTOES-RETOMAR-TRANSFERIR-COMPROVAR-FASE01.md)
- [Contrato de renderização de tarefa](./CAL-ACK-RENDER-NAVEGADOR-FASE01.md)
- [QA de isolamento e ASR](./QA-TUTOR-ASR-AUDIO-ISOLAMENTO-FASE01.md)
- [Continuidade opcional do assunto](./CAL-CONTINUIDADE-ASSUNTO-LOCAL-FASE01.md)
- [Laboratório de consentimento e revogação](./CAL-CONSENTIMENTO-REVOGACAO-LAB-V1.md)
- [Desenho de adaptador transacional, rollback e exclusão](./CAL-ADAPTADOR-TRANSACIONAL-LAB-V1.md)

## Protocolo obrigatório para nova conversa

1. Ler `docs/STATUS-ATUAL-DESENVOLVIMENTO.md` **e** `docs/CONTEXTO-MESTRE-LINGUA.md`.
2. Conferir HEAD real da `main`, branches, PRs abertas e CIs; consultar Render se houver alteração de staging.
3. Conferir os laboratórios já integrados `server/learning-evidence-lab.ts`, `server/learning-evidence-lifecycle-lab.ts` e `server/learning-evidence-transaction-adapter-lab.ts` na `main` e PRs #58/#60/#62. Próxima tarefa: testes browser em ambiente sem credenciais reais e auditoria SQL/privacidade, sem duplicar módulos ou fazer migrações.
4. Trabalhar em branch, executar `pnpm check`, `pnpm test`, `pnpm build` no CI, revisar diff e só integrar com gates verdes.
5. Atualizar **este mesmo documento** ao concluir cada sequência com PRs, commits, testes, deploy, blockers e próxima ação. Atualizar o CONTEXTO-MESTRE resumidamente quando o marco alterar decisões ou arquitetura.
6. Comunicar ao fundador um balanço sucinto e seguir quando ele escrever `ok`; solicitar opinião apenas em decisões criativas/de produto não resolvidas. Nunca afirmar testes manuais inexistentes.

**Governança:** fundador delegou direção técnica ao GPT; nenhuma mudança pode fabricar resultados pedagógicos, enfraquecer consentimento, ativar cobranças ou usar dados reais de alunos para treinamento. A equipe externa (Deep/Claude) pode reauditar na volta, mas não bloqueia correções técnicas devidamente verificadas.
