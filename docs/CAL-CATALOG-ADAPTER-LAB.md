# Laboratório puro Catálogo → CAL — Fase 01 (não integrado)

**24/11/2026 · Status:** branch de laboratório dependente da [PR #41](https://github.com/looksai/Lingua/pull/41). **Sem merge, deploy, banco, endpoints, LLM, SRS ou CSLE.** Não implementa ainda o comportamento no Naruto do site. O arquivo de especificação canônico é [docs/ADAPTADOR-CATALOGO-CAL-V0.1.md](https://github.com/looksai/Lingua/blob/main/docs/ADAPTADOR-CATALOGO-CAL-V0.1.md).

## Código entregue

`shared/pedagogy/cal-catalog-adapter.ts`: protótipo puro que compõe o catálogo de 8 competências/24 tarefas da PR #41 e a máquina de estados CAL da PR #39.

Ações expostas por funções puras:
- `newCatalogCALSession` cria sessão sintética por identidade de conta fornecida **somente pelo host confiável**.
- `listCatalogOptions` apresenta opções; nenhuma competência é marcada “aprendida”.
- `chooseCatalogObjective` aceita **objetivo escolhido explicitamente** pelo aluno (ID autorizado), permite selecionar uma meta profissional sem começar forçadamente por Hello e apenas **informa** pré-requisitos ainda não verificados. Não inventa aprovação de pré-requisitos.
- `issueCatalogTask` cria **plano** com ID de competência/tarefa, versão, fase, estratégia CAL e texto aprovado do catálogo. **Planejado ≠ apresentado**.
- `attestCatalogTaskDelivery` simula chamada **do host confiável**, exige renderização exatamente igual ao template original e valida ID. Somente após entrega confiável se emite `MODEL_PRESENTED`. **Não é prova criptográfica de entrega a um browser**; o piloto não tem browser nem endpoint.
- `respondToCatalogTask` distingue resposta explícita, pergunta, ajuda, alteração de objetivo, pausa e dúvida. Somente resposta **digitada**, ligada à tarefa exibida, produz candidato `meets`/`not_yet` se o gabarito for reconhecível; resposta livre desconhecida é `not_evaluable`, **nunca erro automático**.
- `resumeCatalogSession` restaura sessão sintética pausada.
- `summarizeCatalogSession` retorna observações limitadas; **certification: not_assessed**.

**Limites pedagógicos intencionais:**
- A tarefa de sentido de palavra em ENSINAR pode levar a PRATICAR se o aluno acertou; isso é apenas microcompreensão da tarefa e não competência completa.
- As tarefas de PRATICAR cadastradas pela PR #41 continuam com `assistance:model`; um acerto imediato não autoriza declarar recuperação independente. Não existem tarefas adicionais de revisão real nem demonstração de aprendizagem duradoura aqui.
- As tarefas `open_transfer` precisam de rubrica/contexto/revisão; não viram nota por igualdade de texto. O protótipo retorna `requires_review` apenas quando uma sessão CAL estiver legitimamente em TRANSFERIR, mas **não promove a fase automaticamente**.
- Não grava memória biográfica, dados pessoais, SRS, notas oficiais, `learnerEvidences` ou logs externos. Sem voz/ASR, custos de API ou contato com estudantes.
- Os rótulos `rule_candidate` são **candidatos internos do laboratório**. Uma instância de host de produção precisa garantir identidade, tipo de tarefa, prova de apresentação, timestamp, assistência, serialização de eventos e consentimento.
- **O aluno escolhe o objetivo.** Não há heurística da LLM que determina, sozinha, que o aluno deve estudar uma palavra qualquer. Se não houver objetivo explícito, mostrar menu/sondagem, não chamar automaticamente `chooseCatalogObjective`.
- Estado é **efêmero**, não sincronizado, não persistido; o código só calcula novas estruturas de dados. Vários nós/abas e concorrência real permanecem não cobertos.

## Testes e portas

`shared/pedagogy/cal-catalog-adapter.test.ts` cobre seleção de objetivo não forçado, pré-requisitos incertos, task plan vs delivery, ticket errado/stale/replay, conta diferente, pergunta que não foi apresentada, texto livre, ajuda, ASR inconclusivo, erro lexical, alteração de estratégia por três tentativas válidas, avaliação assistida, pausa/retomada e ausência de integração com outras camadas.

**CI exigido antes de dar como revisável:** `pnpm check`, `pnpm test` e `pnpm build` na branch real, com os testes do adaptador explicitamente incluídos em `shared/pedagogy/**/*.test.ts`. Testes sintéticos não demonstram eficácia com alunos reais.

## Estratégia de PR empilhada

Esta branch começa em `feat/naruto-microcompetency-catalog`, pois depende da PR #41 **não mergeada**. A PR de laboratório será marcada **DRAFT e BLOQUEADA POR #41**; caso seja aberta contra `main` para acionar o CI existente, seu diff incluirá temporariamente o catálogo também. Isso **não autoriza o merge das duas PRs**. Após revisão e merge autorizados da PR #41, a PR do adaptador pode ser atualizada/rebaseada para mostrar apenas seus próprios arquivos. Evitar interferência com a PR #40, que atua no runtime e também permanece sem merge.

## Pendências para auditoria Deep

1. Como o host provará entrega do template **sem aceitar o `delivered` enviado pelo navegador**? Isso é desafio de integração real, não resolvido por função pura.
2. Quando uma frase terminada em `?` é **resposta correta** da tradução (p.ex. `What do you do?`), como distinguir de pergunta ao tutor? Contrato de tarefa entregue/ação explícita + rubrica, não heurística por pontuação isolada.
3. O algoritmo atual aceita `assessor:"rule"` para **etapa local** após candidato do catálogo em tarefa fechada; isso **não grava evidência oficial**. Verificar futuro contrato de proveniência.
4. `MODEL_PRESENTED` só é disparado após confirmação do host, mas o próprio exercício usa texto padronizado; a resposta do tutor ainda pode diferir. Não misturar modelo livre com apresentação de tarefa.
5. Prática após ensino assistido não gera progressão automática até RETOMAR; planejar oportunidade diferida e instrumentos válidos sem forçar domínio.
6. Segurança com usuário autenticado deve vir do backend tRPC; funções puras não têm autenticação de verdade.
7. Concorrência/replay em múltiplas instâncias e histórico durável requerem projeto e migrations separados; fora do escopo.
8. Como mensurar melhora comparado ao Naruto sem CAL (retenção, transferência, frustração, custo e latência)?

**Próximo portão:** revisão de Deep e decisão do fundador antes de adaptar o tutor real, reconfigurar Render ou ligar o flag. Stripe e CSLE permanecem pausados/separados conforme roadmap.
