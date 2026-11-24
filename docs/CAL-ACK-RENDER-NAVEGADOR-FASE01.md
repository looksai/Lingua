# CAL Fase 01 — Sinal de renderização de tarefa no navegador

**Data:** 24/11/2026 · **Escopo:** piloto Naruto/catálogo, somente em memória de processo.

## Três níveis distintos: nunca misturar

1. **Montagem da resposta no servidor:** `AdapterTask.delivered=true` apenas atesta que o backend montou uma resposta com o sufixo exato da atividade. Não demonstra chegada ao navegador.
2. **Sinal do navegador autenticado:** `TutorCatalogTaskView` divide o texto e o prompt por correspondência literal, renderiza o prompt no DOM, observa interseção com viewport e envia `catalogRenderAck({sessionId,deliveryId})`. O servidor valida conta, sessão ativa, ticket atual, entrega montada, flags e allowlist. Também há botão de confirmação manual quando necessário.
3. **Aprendizagem comprovada:** requer execução de tarefa independente, evidências autorizadas, teste real e revisão. O sinal #2 **não** demonstra que a pessoa leu, ouviu, entendeu, aprendeu ou reteve; cliente adulterado pode falsificá-lo. Nenhuma certificação ou registro curricular é criado.

Somente depois de #2 o runtime considera uma mensagem `typed` como possível resposta fechada da tarefa. Sem o sinal, retorna ao comportamento de conversa sem contabilizar acerto/erro.

## Contrato
- `tutor.reply`: adiciona `catalogTask` à resposta **somente** quando a tarefa de catálogo foi montada, permanece ativa e seu texto coincide com o sufixo exato. Caso contrário: `null` ou ausente.
- `tutor.catalogRenderAck`: mutation protegida e com origem validada; aceita apenas `consent:true,sessionId,deliveryId`, sem texto pessoal/áudio. Retorna `recorded|duplicate|rejected`.
- `tutor.catalogPendingTask`: mutation protegida de leitura, sem chamadas ao LLM, para reabrir tarefa pendente após refresh, no mesmo usuário e enquanto o processo conservar a sessão.
- Runtime: `renderedDeliveryId` existe apenas na entrada TTL em memória. Novo ticket invalida recibo anterior; troca de objetivo, pausa, timeout ou identidade inválida impedem reutilização. Não persiste dados privados.

### Segurança de isolamento
A autorização do recibo nunca se baseia em identidade declarada pelo browser; usa `ctx.user.id` autenticado e compara `sessionId` + `deliveryId` com o estado atual do servidor. Essa checagem impede reaproveitar um ticket de outra conta ou de outro objetivo. Ela **não** substitui revisão de eventuais evidências oficiais.

### Limites e QA pendente
- Um evento `IntersectionObserver` **não** é atestado criptográfico de visualização humana. O controle de confirmação é apenas feedback de UX. Não deve ser tratado como tentativa ou acerto.
- O runtime é volátil no Render gratuito: reinício, recarga da instância e TTL de 30 minutos apagam o contexto. O navegador pode mostrar texto local antigo sem ticket válido; o aluno deve escolher uma nova tarefa. Nada deve ser avaliado automaticamente.
- Clientes antigos que não enviam recibo não são avaliados em tarefas fechadas. Não fingir sucesso: orientar atualização de página quando se testar a versão nova.
- Sem teste autenticado real (dois logins, recarga, IO no Chrome desktop, Chrome Android e Safari iOS), não declarar este fluxo homologado.
- Nenhuma alteração de banco, migration, consentimento persistente, CSLE, SRS, learnerEvidences, CEFR ou Stripe.

## Matriz de aceite a executar no navegador

| Caso | Procedimento | Aprovação |
| --- | --- | --- |
| Render | Iniciar atividade Hello e observar texto visível | Um único card, sem duplicação da pergunta |
| ACK | Confirmar visualização e responder digitando | Servidor só contabiliza candidato após receipt |
| Sem ACK | Responder antes da confirmação | Nenhuma observação/erro fabricado |
| ASR | Responder por microfone após ACK | Nenhuma classificação como digitação/pronúncia |
| Conta B | Tentar confirmar ticket da conta A | Rejeição pelo servidor; estado inalterado |
| Repetição | Reenviar o mesmo ticket duas vezes | Primeiro recorded, segundo duplicate, sem progresso extra |
| Ticket antigo | Mudar objetivo e enviar receipt anterior | Rejeitado |
| Reload | Atualizar página com tarefa pendente | Recuperação autenticada ou estado expirado claramente apresentado |
| Sem IntersectionObserver | Simular navegador sem esse recurso | Botão manual de confirmação, sem êxito automático |
| Render reinicia | Reiniciar processo durante tarefa | Recibo antigo rejeitado; nenhuma evidência reconstruída |
| Revogação | Revogar consentimento com ACK pendente | Nenhuma UI ou memória de outra conta |
| Mobile | Testar viewport e scroll até a tarefa | Visibilidade sinalizada só após card entrar na viewport |

**Resultado atual:** apenas testes unitários, integração de router e renderização SSR. QA humano e teste de navegador automatizado ainda não realizados.
