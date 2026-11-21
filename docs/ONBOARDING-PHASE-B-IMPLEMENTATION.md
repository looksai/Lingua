# Fase B — Onboarding Jarvis (PR de implementação)

**Status:** implementação em branch `feat/onboarding-jarvis`, revisão pendente. **NÃO executar migration nem deploy antes de aprovação do fundador e auditor Deep.**

## O que esta entrega realmente contém

- Separação entre `/` público, `/demo` fictício e aluno autenticado.
- Nome, estilo e interesse do tutor, gravados por `userId`.
- `interfaceLocale`, `nativeLanguage` e `targetLanguage` são campos separados. **Somente pt-BR / pt / en** está liberado nesta primeira entrega; outros idiomas ainda não existem.
- Cinco interações **textuais de triagem**, com perguntas de produção escrita e compreensão de leitura, respostas persistidas em tabela dedicada e retomada após login. **Não constituem diagnóstico completo ou certificação.**
- Feedback curto e opcional via `OPENAI_API_KEY` (Chat Completions; `LINGUA_TUTOR_TEXT_MODEL` padrão `gpt-4o-mini`), quando o aluno **marca consentimento de envio à OpenAI**. Se desmarcar ou não houver API, resposta padrão sem simulação de análise.
- Plano **exploratório** contextualizado pelo interesse explícito, sem nível CEFR ou acertos inventados; dashboard mostra número real de respostas e itens reais do SRS.
- Laboratório de Leitura e Revisões reaproveitados, sem alterações no algoritmo SRS.
- Nenhuma integração CSLE ou captura de microfone criada.

## Limitações essenciais

1. **Não existe ainda tutor Jarvis plenamente proativo, voz, avaliação acústica, diagnóstico multihabilidade, seleção autônoma de atividades ou integração CSLE.** O texto do tutor no onboarding é contextual, opcional e limitado.
2. O plano inicial é um ponto de partida por interesse, não inferência de capacidade. Cinco respostas por texto ainda **não** fundamentam grau de fluência.
3. O legado `/demo` ainda usa a UI Welma e seus percentuais **explicitamente rotulados como fictícios** e bloqueados para usuários autenticados.
4. Persistência exige aplicação manual controlada da migration `drizzle/0005_onboarding_jarvis.sql` em staging. **A migration 0004 do PR #14 não deve ser aplicada.** A tabela de perfil não deve ser substituída por `userKnowledgeStates`.
5. A versão atual do `ReadingLab` e do `ReviewDeck` possui suas próprias pendências documentadas; preservação de componentes não equivale a QA integral.
6. `OPENAI_API_KEY` pertence apenas ao servidor. A opção LLM exige orçamento, políticas de retenção do provedor e teste de latência/custos. A escolha padrão de modelo não afirma que é o melhor ou o mais barato.
7. A contagem de respostas na tela é apenas registro, **não pontuação**. Feedback do LLM nunca entra como evidência curricular.
8. O tutor não tem ainda edição/exclusão individual de respostas ou exportação: são requisitos pendentes de privacidade antes de disponibilizar publicamente, além do controle de acesso e exclusão em cascata de conta.
9. O app não deve oferecer «onboarding pronto em Render» até a migration staging ser aprovada/aplicada, API validada e testes E2E reais concluídos.

## Controle de migração — procedimento proposto (não executar automaticamente)

1. Confirmar backup, acesso com privilégio mínimo e quais migrations manuais já rodaram em Aiven (`0000`, `0001`, `0002`, `0003`); comparar esquema real com `drizzle/schema.ts`.
2. Inspecionar o plano e executar **`0005_onboarding_jarvis.sql` apenas em staging**, com SQL revisado e aprovação, e conferir índices/FKs/collation.
3. Validar usuário novo, antigo, dois usuários alternados, concorrência e erro por banco indisponível; depois testar recuperação por login em aparelho diferente.
4. Rolar back com estratégia de backup e proteção de dados; não executar `pnpm db:push` cegamente: o journal histórico não acompanha todas as migrations manuais.

## Testes/gates

**CI:** `pnpm check`, `pnpm test`, `pnpm build`. O workflow P0 roda em PR para `main`; status deve ser lido no GitHub, sem supor sucesso.

**E2E manual em staging:** cadastro, escolha do nome, nome distinto em outra conta, cinco respostas e retomada após reload, defer e resume, logout/login, recusa de IA, falha do provedor, migração ausente com erro claro, demo pública sem identidade do aluno, dashboard sem dados fake.

**Testes integrais DB:** `saveProfile`, `submit` serializado por lock de perfil, idempotência de `taskId`, mudança de conta, ausência de misturas, exclusão em cascata, concorrência em duas abas e registro no banco. Dependem de MySQL staging; **não representados como concluídos** por testes unitários.

**Perf/segurança:** sanitização, proveniência do feedback, quotas por usuário, auditoria de custos, LLM indisponível, política de retenção de respostas, exportação/exclusão, acessibilidade e QA Android antes de produção.

## Voz econômica — próximo módulo, não incluído

Push-to-talk: ASR configurável -> LLM texto -> TTS configurável, com fallback texto. Evitar novas integrações a modelos anunciados como deprecated: `whisper-1` encerra 26/02/2027 e `tts-1` em 06/01/2027. Adoção de `gpt-transcribe` / TTS substituto e comparação com Google requerem orçamento e testes. **Não prometer redução de 100x sem medições reais**.

## Governança

PR de implementação permanecerá **Draft** até parecer independente do Deep e aceite do fundador. Nenhum merge, schema push, alteração no Aiven/Render ou deploy autorizado apenas pelo CI verde.
