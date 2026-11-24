# Registro de ativação controlada — Naruto CAL no staging (24/11/2026)

**Estado conferido:** **Render LIVE**, deploy `dep-dc2gjim7bikc738kf1r0`, commit `58718a4f3a6f5f4aad199607c2d6c8e91f4190d1`, concluído **2026-11-24T03:52:52Z** (00h52min52s em Natal/RN).  
**Serviço exclusivo de staging:** `lingua-p1-staging-le7u`, ID `srv-dc0mh2cs728c73ant6e0`, URL https://lingua-p1-staging-le7u.onrender.com.  
**Configuração ativada somente neste serviço:** `CAL_ENABLED=true` via atualização incremental de variável do Render; a atualização **disparou o deploy automaticamente**, pois a nova configuração precisa ser carregada no processo. `autoDeployTrigger=off` para novos pushes permaneceu inalterado.  
**Confirmação:** API Render `get_deploy` retornou status `live`, commit exato acima. Logs mostram `Build successful`, `Running 'node dist/index.js'`, `Server listening on port 10000` e `Your service is live`; evento `deploy_ended` com `deployStatus=succeeded`.  
**Limite de verificação:** não houve login de uma conta nova nem sessão interativa de aluno validada pelo fundador; a tentativa de consulta HTTP pública independente do endpoint `/api/health` via ferramenta externa não produziu resposta verificável. **Live do Render não deve ser confundido com homologação pedagógica.**

## Histórico exato de código aprovado pelo fundador

- **PR #41, catálogo:** merge squash `25b02316ed5f5759e05e14f95dbd14233a47a533` → `main`. 8 microcompetências, 24 tarefas; **catálogo puro, ainda não chamado pela rota real de tutor**.
- **PR #42, adaptador puro Catálogo → CAL:** merge commit `90cf82faaf3e9a0fec72660e3a98ace5244a4ffd` → `main`. O catálogo estava empilhado; os três blobs da PR #41 foram comparados entre `main` e #42 e eram **idênticos** antes do merge. **O adaptador permanece desacoplado do tutor runtime**.
- **PR #40, integração tutor:** merge squash `58718a4f3a6f5f4aad199607c2d6c8e91f4190d1` → `main`. Ativa um piloto CAL com `CAL_ENABLED=true`, respeitando autenticacão/consentimento e allowlist existentes.
- **PR #43, QA pós-merge** (https://github.com/looksai/Lingua/pull/43): **DRAFT, NÃO MERGEADA**; usa base de `main` pós-#40/#41/#42. [CI #45322249258](https://github.com/looksai/Lingua/actions/runs/45322249258) **SUCCESS**: TypeScript, Vitest (**24 arquivos de testes**, incluindo 5 smoke tests novos), build. O CI do código combinado não substitui teste autenticado no staging.

## Comportamento verdadeiramente ativado no Naruto de staging

**Ligado:** `server/cal-integration.ts` em `tutor.reply` com `CAL_ENABLED=true`. Para usuário elegível/autenticado com consentimento e suporte de iniciante absoluto, o backend pode propor um ciclo **limitado** na microfrase `Hello = Olá`, injetar estratégia determinística no prompt existente e classificar candidatos de resposta **somente de tarefas fechadas explicitamente apresentadas**. Três erros verificáveis podem provocar nova estratégia (regra experimental). Solicitações de ajuda, textos livres, perguntas e mudanças de objetivo não viram erros por falta de gabarito. O estado provisório fica em `Map` no processo, isolado por `userId`, TTL de 30 minutos; reinícios perdem o estado.

**Ainda NÃO ligado:** os arquivos `shared/pedagogy/microcompetency-catalog.ts` e `shared/pedagogy/cal-catalog-adapter.ts` estão presentes no build, mas a **rota real não os importa nem usa**. O Naruto **ainda não escolhe dinamicamente** “profissão”, “entrevista” ou outros objetivos do catálogo por esse adaptador. `RETOMAR/TRANSFERIR/COMPROVAR` **não são completados com evidência real no chat integrado**. O experimento fechado não comprova domínio, retenção diferida, pronúncia, CEFR ou melhoria comparativa de aprendizagem.

**Permanecem intactos:** `learnerMemories` e consentimento atual, SRS, Aiven staging sem migration nova, CSLE independente, PR #32 Stripe pausada (schema 0008 não aplicado), serviços Render distintos deste staging.

## Teste manual sugerido ao fundador quando houver disponibilidade

1. Abrir https://lingua-p1-staging-le7u.onrender.com e usar conta de **testador já autorizado** pela configuração existente de tutor. Conta nova sem allowlist pode receber tutor local/erro de autorização; isso **não prova defeito no CAL**.
2. Dizer: **“Naruto, eu não sei nada de inglês. Quero aprender do zero.”** Observar se há exemplo, explicação em português e pergunta objetiva “O que significa Hello em português?”.
3. Responder **“Olá”** e verificar se o Naruto passa à produção da saudação. Responder **“Hello”**; ele não deve dizer que o aluno dominou o inglês.
4. Repetir cenário de respostas **“Goodbye”** quando a tarefa “Como você cumprimentaria alguém em inglês?” realmente tiver sido apresentada: três erros lexicais confiáveis devem resultar em reensino com estratégia distinta, sem punição.
5. Testar **“Não sei”** e **“Quero estudar para entrevista”**: pedir ajuda ou mudar intenção não deveria ser avaliado como resposta errada à tarefa.
6. Testar memória pessoal autorizada com consentimento separado, sem compartilhar fatos privados nos logs de QA; verificar que Naruto não inventa certificações.
7. Registrar prints/desvios apenas quando o fundador puder. **Não alegar teste humano realizado antes disso**. Comparação de eficácia sem/com CAL exige avaliação de aprendizagem, não só satisfação.

## Rollback operacional (reversível)

Se o piloto causar comportamento ruim, o caminho de menor risco é atualizar **somente** `CAL_ENABLED=false` no serviço staging `srv-dc0mh2cs728c73ant6e0`. A atualização de variável pode **disparar outro deploy**, como ocorreu na ativação; confirmar o novo deploy `live`. Isso desliga a nova diretiva e devolve o fluxo de tutor ao comportamento anterior, sem migration. Em defeito maior, aprovar separadamente rollback do commit de aplicação do Render. **Não alterar produção ou outras variáveis.**

## Próximo incremento de engenharia (não autorizado automaticamente por este deploy)

Projetar uma nova PR de **integração runtime do catálogo → adaptador → tutor**, sob feature flag e com escolha explícita de objetivos, tickets de tarefa verificados pelo servidor e QA completo. Somente após uma avaliação real válida considerar desenho de `learnerEvidences`; não criar registros oficiais por coincidência lexical. Não iniciar CSLE real nem reativar Stripe.
