# Registro de ativação — catálogo CAL no Naruto staging (24/11/2026)

**Estado verificado pela API Render:** **LIVE**.  
**Deploy:** `dep-dc2h2rnlk1mc739vj6rg`, commit `2ba457162e76003ae3beef6efd9ec582af012ec2`, concluído em **2026-11-24T04:25:26.838417Z** (**01h25min26s de Natal/RN, UTC−03**).  
**Staging único:** `lingua-p1-staging-le7u` / `srv-dc0mh2cs728c73ant6e0` / https://lingua-p1-staging-le7u.onrender.com.  
**Auto-deploy de pushes:** continua `off`. A alteração do ambiente dispara seu próprio deploy. **Não houve ativação de outros serviços**.

## Autorização e execução

O fundador encaminhou auditoria Deep aprovando a PR #44 e **autorizou expressamente** seu merge na `main` e a ativação das flags **somente no staging**. Não houve autorização para produção, Stripe ou CSLE.

1. Antes do merge, [PR #44](https://github.com/looksai/Lingua/pull/44) em head `7b95ec8b85be26b5845a81fe36ea7e50bcd3d58d`, CI [#45324350255](https://github.com/looksai/Lingua/actions/runs/45324350255) **verde** (TypeScript, Vitest: 25 arquivos, incluindo **34 testes novos** de controlador+tRPC, e build).
2. Merge squash confirmado na `main`: `2ba457162e76003ae3beef6efd9ec582af012ec2`; PR #44 `merged=true`, fechada.
3. `mcp__Render__update_environment_variables` aplicado **somente ao serviço staging `srv-dc0mh2cs728c73ant6e0`**. Atualizados **apenas**:
   - `CAL_ENABLED=true` (mantida a configuração existente).
   - `CAL_CATALOG_ENABLED=true` (nova flag habilitada).
   - Atualização **incremental** (`replace=false`); outras variáveis não foram substituídas.
4. O Render **disparou automaticamente** o deploy `dep-dc2h2rnlk1mc739vj6rg` para consumir a nova configuração, com commit exato da PR #44. Logs incluem `Build successful`, `Running 'node dist/index.js'`, `Server listening on port 10000` e `Your service is live`. Status API `live` às 04:25:26 UTC.

## O que realmente está ligado

A rota autenticada `tutor.reply` passa pela política `catalogCALRuntimeEnabled` **apenas quando as duas flags são `true`**, após os mecanismos existentes de autorização, perfil, consentimento, orçamento e memória autorizada.

- Um pedido pedagógico **explícito** por assunto catalogado pode definir microcompetência (`identity.my-name`, `work.welder-example`, saudações, cortesia e pergunta sobre ocupação), produzir plano CAL local e anexar pergunta **versionada do próprio servidor** após a resposta da IA passar pelos guardas de fatos/idioma.
- Um pedido genérico de inglês sem assunto específico pode receber menu curto de escolha, **não imposição de Hello**.
- Uma resposta textual fechada reconhecida pode produzir **candidato de observação limitada**, nunca prova de domínio. Texto fora de contexto, ajuda, mudança de meta e pergunta não viram erro por ausência de correspondência.
- O controlador utiliza `Map` por ID autenticado, TTL 30 min e limite 100 sessões; o estado se perde após reinício e não sincroniza servidores.
- `inputModality="asr_text"` quando explicitamente enviado informa que resposta transcrita não deve ser avaliada por esse caminho; **ausência do campo não atesta origem digitada**. Não há diagnóstico fonético.
- O exemplo `I am a welder` é **frase de personagem fictício** até que o próprio aluno tenha declarado ou consentido com uso de fato pessoal; não criar certificação ou tempo de serviço.
- **O navegador não envia ACK de tarefa exibida**; o controle atual atesta composição da resposta pelo servidor, não leitura do estudante. LLM não decide domínio ou SRS.

## O que NÃO está pronto

**Não afirmar “ciclo CAL completo” nem “Fase 01 concluída”.** O código tem seis estados conceituais, porém a ligação real nesta PR somente cobre seleção, ensino e práticas **fechadas/assistidas**. Revisão diferida (`RETOMAR`), transferência aberta com rubrica adequada (`TRANSFERIR`) e comprovação baseada em evidência (`COMPROVAR`) **não foram homologadas no tutor real**. Não há teste humano autenticado, medição comparativa de retenção, prova CEFR ou certificação. Testes automáticos com provedor simulado **não equivalem** a experiência pedagógica validada.

**Fora do escopo/inalterados:** `learnerEvidences` ainda não aprovada/implementada, banco Aiven sem migrations novas, memórias e SRS sob governança anterior, CSLE independente/congelado para esta etapa, PR #32 Stripe não mergeada e fora do fluxo, produção não alterada.

## QA manual do fundador, quando houver tempo

Testar **somente** https://lingua-p1-staging-le7u.onrender.com com **conta autorizada na allowlist existente do tutor**. Criar conta nova sem permitir seu e-mail no tutor pode bloquear a IA por política de teste, não necessariamente por CAL.

**Entrada principal:**

> Naruto, eu não sei nada de inglês. Quero aprender a falar sobre a minha profissão de soldador.

Verificar:
1. A escolha é sobre `work.welder-example`, sem forçar `greeting.hello`, e a aula começa em português.
2. O Naruto explica `I am a welder` como exemplo, faz a pergunta do catálogo, aceita resposta compatível (ex.: `Sou soldador`) e propõe expressão escrita para praticar (`I am a welder`). Não declarar domínio por isso.
3. `Não sei` solicita reensino sem erro falso; uma pergunta off-topic não é penalizada.
4. Fatos biográficos/certificações **não** são inventados; memória só aparece se estiver explicitamente salva com consentimento.
5. Uma nova conta/testador não recebe sessão de outro.
6. Ao reiniciar sessão, não alegar que o estado volátil permanece.
7. Se o tutor mencionar revisão diferida, transferência, “aprovado” ou “aprendido”, checar se tem evidência verdadeira; **não contar fala da IA como comprovação**.

**Não realizado nesta execução:** esse teste humano depende da disponibilidade do fundador. Só o estado de deploy/render foi verificado.

## Rollback e próximo portão

Se o comportamento novo falhar, atualizar **somente `CAL_CATALOG_ENABLED=false`** no serviço `srv-dc0mh2cs728c73ant6e0` via operação incremental (`replace=false`), mantendo `CAL_ENABLED=true`. A mudança **pode disparar novo deploy**; verificar que ele termina `live`. Isso devolve ao piloto Hello de antes, sem migration. Nunca alterar produção ou banco para esse rollback simples.

**Próximo trabalho de Fase 01:** testar o Naruto com usuário real quando possível, analisar logs sem dados sensíveis, melhorar seleção de competências, instrumentos de retenção/transferência e rubricas antes de considerar `learnerEvidences`. **Iniciar CSLE Fase 02 exige decisão estratégica posterior**, não se deduz de um único teste feliz.
