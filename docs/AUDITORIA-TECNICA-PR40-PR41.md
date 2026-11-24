# Auditoria técnica preliminar — PR #40 (CAL) + PR #41 (Catálogo)

**Data:** 24/11/2026 UTC · **Status:** inspeção de código e QA automatizado do GPT, **ainda aguardando auditoria independente de Deep e autorização do fundador**. Não é homologação pedagógica, de integração humana, de banco ou do Render.

## Fontes e resultados verificáveis

| Revisão | Head auditado | CI vigente | Resultado |
|---|---|---|---|
| [PR #40 — CAL gradual](https://github.com/looksai/Lingua/pull/40) | `62ea852e176decf9d9e2bc4dc2bd4ac300c4f224` | [#45319194259](https://github.com/looksai/Lingua/actions/runs/45319194259) | **SUCCESS:** TypeScript, Vitest e build |
| [PR #41 — Catálogo puro](https://github.com/looksai/Lingua/pull/41) | `f456e5924dfa2380004d91dd1c0946ff53a76fe6` | [#45319148157](https://github.com/looksai/Lingua/actions/runs/45319148157) | **SUCCESS:** TypeScript, Vitest e build |

**Nenhum merge ou deploy dessas duas PRs.** O Render segue servindo a versão anterior à conexão CAL. PR #39 (máquina pura) já havia sido mergeada, mas não ativada no site. As rotas comerciais e CSLE não foram tocados.

## Achados e correções da rodada

### PR #40: falsas avaliações de mensagens livres

**Falha detectada na inspeção:** após apresentar “O que significa Hello?”, o piloto considerava **qualquer resposta curta não interrogativa** uma tentativa da tarefa, podendo interpretar “Quero estudar para entrevista” ou “Eu trabalho com solda” como resposta errada e evoluir o contador de tentativas. Isso viola prioridade da intenção atual e honestidade avaliativa.

**Mudança efetuada:**
- Introduzidas listas de **alternativas lexicais explícitas** do exercício-piloto; somente respostas corretas ou distratores inequívocos são candidatos à avaliação.
- Texto livre/novo objetivo passa pelo tutor normal, sem criar evidência negativa e sem descaracterizar a pergunta anterior.
- O registro de pergunta entregue ficou mais estrito: a pergunta deve ter sido realmente **formulada como pergunta ao final da resposta do Naruto**; simples menção ao enunciado no corpo da resposta não basta.
- O aluno que diz “entendi” não é automaticamente avaliado nem promovido a `PRATICAR`.
- Testes adicionados para objetivo livre, mudança de assunto, pergunta mencionada sem efetiva aplicação e autodeclaração de entendimento.
- O CI revelou uma expectativa de teste antiga que já não respeitava o bypass; corrigida para verificar ausência de evento/evidência, e nova execução passou.

**O que esses testes NÃO provam:** que o modelo sempre apresentará a pergunta exata, que a regra cobre toda linguagem natural, que o usuário entendeu de fato ou que o estado persistirá entre sessões. O modelo pode parafrasear, gerando falsos negativos conservadores.

### PR #41: respostas fora de catálogo classificadas como erro

**Falha detectada na inspeção:** `evaluateClosedMicrotask` atribuía `not_yet` a qualquer texto que não coincidisse com o gabarito, mesmo que fosse pergunta livre, mudança de objetivo ou outra frase válida ainda não cadastrada.

**Mudança efetuada:**
- A função agora retorna `meets` somente para resposta catalogada; `not_yet` apenas para um **distrator lexical conhecido** de tarefa do mesmo tipo; `not_evaluable` em texto desconhecido.
- Testes verificam que “Quero aprender inglês para entrevistas”, “Eu trabalho em uma fábrica” e outras frases livres não são fracassos.
- A detecção de perguntas ocorre antes da normalização (pois `?` era removido); esse erro também foi corrigido nesta PR anteriormente.
- Transferência aberta e ASR continuam sem avaliação automática; resultados do avaliador são somente **`rule_candidate`**, nunca domínio/CEFR.

**Limite:** o catálogo tem apenas 8 competências e 24 tarefas iniciais, não define ainda um currículo completo; dependências `prerequisitesSatisfied` só podem ser consideradas válidas se fornecidas por política confiável do Lingua, nunca por um cliente ou por texto gerado pelo tutor.

## Revisão dos invariantes

| Requisito | Avaliação de código |
|---|---|
| `CAL_ENABLED` desligada por padrão | Preservado na PR #40, ainda não ligado no Render |
| Consentimento e autenticação anteriores ao caminho CAL | Preservados no fluxo `tutor.reply`; QA com mocks |
| Seleção determinística de estratégia antes da LLM | Preservada; sem nova chamada de decisão |
| Memória pessoal não equivale à evidência pedagógica | Preservado; CAL não cria/edita `learnerMemories` |
| SRS não recebe palavras automaticamente | Preservado; sem escrita de revisão |
| Três erros configuráveis, três acertos não certificam | Preservado na máquina pura e no piloto limitado |
| Nenhum julgamento fonético a partir de Whisper | Preservado; `asr_text` não é comprovação acústica |
| CSLE independente | Preservado; nenhum motor real conectado |
| Sem DB/migration/produção | Preservado nas PRs #40/#41 |
| Retenção do CAL entre reinícios e dispositivos | **NÃO EXISTE** nesta etapa; processo local |
| Transferência/revisão diferida com rubrica real | **NÃO IMPLEMENTADAS** no tutor integrado |
| Eficácia com alunos reais | **NÃO VALIDADA** |

## Questões técnicas ainda abertas (para Deep)

1. **Detecção de tarefa entregue:** depender de regex sobre texto livre do tutor é provisório; pode gerar falso negativo ou reconhecer um enunciado meramente citado. Preferir futuro componente/tarefa versionada entregue pelo servidor e atestada pelo cliente autorizado.
2. **Ambiguidade de intenção:** “tchau” pode ser tradução errada de “Hello” ou despedida real. Não há solução geral confiável só com heurísticas; caso ambíguo deve permitir esclarecimento/pausa sem punição.
3. **Trilha curricular vs interesse do aluno:** não forçar “Hello” quando ele pediu inglês para emprego/viagem. A seleção de objetivo precisa ser explicitamente negociada; o catálogo não deve virar checklist rígido.
4. **Resposta interrogativa como gabarito:** em “What do you do?”, uma resposta correta em português pode terminar em `?`. O avaliador atual conserva `not_evaluable` para qualquer pergunta; deve ser resolvido por apresentação/ID de tarefa e intenção, não por remover a salvaguarda indiscriminadamente.
5. **Escopo de `Map` por usuário:** não dura restart nem sincroniza instâncias/abas de maneira persistente. Nenhuma evidência oficial antes de contratos de concorrência, retenção e consentimento.
6. **`assessor:rule` e ID de tarefa:** em futura integração, devem ser gerados/verificados por serviço confiável, nunca por payload do aluno/LLM.
7. **Latência/custo:** testes de fake provider não medem custo real nem desempenho da chamada de IA; aferir em ambiente autorizado antes de claim comercial.
8. **Currículo e avaliação:** `eligibleMicrocompetencies` depende de pré-requisitos atestados; nenhum número de correspondências lexicais determina domínio ou CEFR.
9. **Compatibilidade entre PRs:** PR #40 e PR #41 foram criadas de `main` e são independentes. O adaptador futuro tem dependência de ambos e deve ser planejado depois da revisão/decisão, com integração/CI isolados.

## Próxima etapa proposta

1. Deep audita as duas PRs e esta nota, respondendo às questões acima.
2. Fundador aprova ou solicita correções; **sem merge automático**.
3. Desenhar protótipo **puro, sem runtime**, do adaptador `Catálogo → CAL → Naruto` conforme [especificação v0.1](./ADAPTADOR-CATALOGO-CAL-V0.1.md); a primeira versão deve exigir tarefa entregue e decisão de objetivo confiável.
4. Planejar teste controlado `CAL_ENABLED=true` no staging apenas com autorização expressa, allowlist e rollback; não tratar CI como substituto de teste com alunos.
5. Atualizar `CONTEXTO-MESTRE-LINGUA.md` com SHAs e CI atuais e a decisão de Deep/fundador.

**Parecer preliminar:** as falhas encontradas na inspeção foram corrigidas em branch, os testes/CI atuais estão verdes e o trabalho está **apto à auditoria**, **não** à liberação de produto. Não houve alteração de Render, Aiven, CSLE ou Stripe.
