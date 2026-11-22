# PAYWALL-STRIPE — Lingua B2C (proposta técnica)
**Estado: documentação para auditoria; NENHUM checkout/webhook/pagamento implementado, nenhum segredo configurado, nenhuma assinatura cobrada.** Preparado em 22/11/2026. Não mesclar/publicar este plano antes da homologação da voz, chat e sondagem, do orçamento por aluno e de uma migration de billing própria.

## Objetivo B2C
Conseguir primeiros 100 assinantes pagantes, sem transformar o Lingua em “10 SaaS”. Checkout hospedado pela Stripe; página própria apenas com benefícios, preço e botão **Assinar Premium**. Proposta comercial inicial: mensalidade **US$ 9,90** ou preço local em **BRL** a definir pelo fundador. **São duas Prices diferentes configuradas e verificadas no Stripe**, não converter valores no navegador. Confirmar capacidade de assinatura/moeda de acordo com país, conta e meios de pagamento. Não anunciar serviço ilimitado nem preço definitivo antes de comprovar custos de voz e IA.

## Modelo trial sugerido (não ativo)
**3 dias de teste OU 20 respostas do tutor com IA, o que terminar primeiro.**
- Início `trialStartedAt`: primeira resposta com IA autorizada entregue ao aluno, não simplesmente cadastro/onboarding ou pergunta de sondagem. `trialEndsAt = trialStartedAt + 72 horas` com horário do servidor.
- `trialSuccessfulReplies` incrementa atomicamente na mesma transação do registro idempotente de interação bem-sucedida. Cada resposta IA entregue conta 1; falhas Groq e fallback local não consomem a franquia exibida ao aluno (mas contam no limite técnico do fornecedor). Não confiar em contador enviado pelo browser.
- Gate antes do fornecedor: usuário premium ativo **ou** trial iniciado e ainda não vencido, com menos de 20 respostas. Reservar atomically uma interação em andamento para evitar abuso em múltiplas abas/retries; liberar reserva em falha, finalizar em sucesso. Definir idempotencyKey por tentativa e impedir duplicidade por reenvio.
- Após expiração exibir `Assinar Premium`; manter leitura/SRS e acesso a termos, perfil e gestão de cobrança. Respostas antigas do tutor são legíveis, mas novas chamadas `tutor.reply`, `tutor.transcribe` e `tutor.neuralEnglish` premium devem ser guardadas no **servidor**. Definir franquias de áudio/ASR específicas (segundos, caracteres, requisições por janela) e um plano com fair use; não usar simplesmente “mensagens ilimitadas”.
- A aplicação continua privada e allowlisted até teste de segurança/precificação. Não abrir cadastro público enquanto limites persistentes, verificação de email, recuperação de conta, consentimento e abuso não forem resolvidos.
- Não usar Stripe Trial como duplicação desta franquia de produto: o período grátis de uso ocorre **antes** da assinatura/cadastro de cartão. O trial Stripe, se futuramente desejado, é política independente, e pode criar obrigações de cobrança/consentimento.

## Arquitetura mínima, com propriedade de estado
Não usar `isPremium` booleano simples como autoridade; um cancelamento, `past_due`, cobrança assíncrona e reembolso tornam isso inseguro. Pode haver um campo derivado para UI, mas direito de acesso vem de **assinatura sincronizada** e política de estado.

Tabelas candidatas (NOVA migration de billing revisada, distinta da 0006):
1. `billingCustomers(userId PK FK users.id, stripeCustomerId UNIQUE, createdAt, updatedAt)`
2. `billingSubscriptions(stripeSubscriptionId PK, userId FK, stripePriceId, currency, status, currentPeriodEnd, cancelAtPeriodEnd, trialEnd, lastSyncedAt)`. Versão e status atualizados a partir do Stripe; checar campos de período nas versões recentes do SDK/API.
3. `stripeWebhookEvents(stripeEventId PK, type, receivedAt, processedAt, status)` para deduplicação, diagnóstico e reprocessamento seguro; não armazenar payload completo com PII.
4. `tutorUsage(userId, interactionId UNIQUE/PK, kind, state, occurredAt, costCategory, countable)` com índice `(userId, occurredAt)`. Contagem de trial por transação e controle de áudio para custo.
5. `tutorTrialState(userId PK, trialStartedAt, trialEndsAt, successfulReplies)`. Não atualizar `users` diretamente no webhook sem associação forte `stripeCustomerId`/ `userId`.

Toda consulta/mutação é autenticada (exceto webhook Stripe com assinatura validada); ownership por `ctx.user.id`. Remover dados de cobrança exige política de retenção fiscal separada e exclusão de dados pedagógicos sem comprometer registros legais.

## Fluxo Stripe Checkout
1. No dashboard Stripe em **modo teste**, criar Product `Lingua Premium` e pelo menos uma Price **recorrente mensal**. Para USD, `unit_amount=990` centavos representa US$ 9,90. Para BRL, o fundador define o preço e cria Price BRL separada. Não confundir Price IDs de teste/live.
2. Em Render, no serviço único de staging, adicionar apenas quando a implementação aprovada estiver pronta:
   - `STRIPE_SECRET_KEY=sk_test_...` (segredo de servidor)
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (segredo específico do endpoint)
   - `STRIPE_PRICE_USD_MONTHLY=price_...`
   - `STRIPE_PRICE_BRL_MONTHLY=price_...` (opcional)
   - `STRIPE_BILLING_ENABLED=false` até testes
   - `PUBLIC_APP_URL=https://lingua-p1-staging-le7u.onrender.com` somente para URLs permitidas
   Nunca inserir segredos na conversa, GitHub, navegador ou logs. Em produção usar novo conjunto `sk_live_...`, `whsec` e Price IDs próprios.
3. No backend (Node/Express + tRPC) implementar mutation autenticada `billing.createCheckout({currency:"usd"|"brl"})`. Verificar a moeda numa **allowlist de Price IDs** no servidor; usuário autenticado, conta/e-mail validado, sem premium ativo, rate limiting e CSRF/origin check.
4. Resolver/criar um único Customer por `userId`, com chave idempotente; **nunca confiar em userId/e-mail enviados pelo cliente**. Persistir vínculo interno `stripeCustomerId`.
5. Usar SDK Stripe Node com versão controlada no lockfile e `stripe.checkout.sessions.create` em `mode:"subscription"`, `customer`, `client_reference_id:String(userId)`, `line_items:[{price:priceId,quantity:1}]`, `success_url` e `cancel_url` construídas de domínio fixo; passar metadados não sensíveis também em `subscription_data.metadata` quando necessário.
6. Retornar apenas `session.url` para redirecionar via browser. Botão **Assinar Premium** abre o Stripe Checkout hospedado. `success_url` **nunca** promove usuário sozinho; mostrar “Aguardando confirmação do pagamento” e consultar `billing.status` até webhook/reconciliação.

### Pseudocódigo de referência (não conectado)
```ts
const priceId = currency === "usd" ? env.STRIPE_PRICE_USD_MONTHLY
  : currency === "brl" ? env.STRIPE_PRICE_BRL_MONTHLY : null;
if (!priceId) throw new Error("Moeda indisponível");
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer: linkedStripeCustomerId,
  client_reference_id: String(authenticatedUserId),
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: env.PUBLIC_APP_URL + "/billing/success?session_id={CHECKOUT_SESSION_ID}",
  cancel_url: env.PUBLIC_APP_URL + "/premium",
  subscription_data: {metadata:{lingua_user_id:String(authenticatedUserId)}}
}, {idempotencyKey: stablePurchaseAttemptId});
return {url:session.url};
```

## Webhook obrigatório, assinatura e transições
Endpoint separado `POST /api/billing/stripe-webhook`. Receber **raw body** (Express `express.raw({type:"application/json"})` *antes* de qualquer `express.json()` global ou capturar raw buffer na configuração apropriada). Verificar `Stripe-Signature` com `stripe.webhooks.constructEvent(raw, signature, STRIPE_WEBHOOK_SECRET)`. Rejeitar assinatura inválida e limites de payload; não registrar raw body, chave, cartões ou PII.

Processar eventos relevantes **idempotentemente** pelo `event.id` e com transações. O Stripe pode duplicar, atrasar ou entregar fora de ordem: ao receber evento, recuperar a assinatura/Customer atual no Stripe quando possível e reconciliar com `stripeSubscriptionId` já vinculado ao `userId`; nunca confiar em um email apresentado no evento para ligar uma assinatura a outra conta.

| Evento | Responsabilidade |
| --- | --- |
| `checkout.session.completed` | Confirmar vínculo Customer/Subscription e registrar checkout; **não liberar Premium apenas por retorno ou status pendente** |
| `invoice.paid` | Reconciliar assinatura e conceder/renovar acesso se fatura e estado atuais permitem |
| `invoice.payment_failed` | Registrar falha, oferecer atualização via Billing Portal; aplicar política de tolerância comunicada |
| `customer.subscription.updated` | Atualizar status/cancelamento/intervalo conforme estado Stripe |
| `customer.subscription.deleted` | Revogar direito conforme término efetivo |

Regra inicial de `premiumAllowed`: `status=active` com período válido e pagamento confirmado (ou política explícita de `trialing` caso trial de assinatura seja autorizado); `past_due`/`unpaid`/`incomplete`/cancelado = bloqueado ou período de tolerância claramente estipulado. Nem todo evento `invoice.paid` deve criar premium se não corresponder ao plano e assinatura previstos. Reembolsos, chargebacks e disputas precisam regra e teste antes de produção. Erros de processamento devem produzir 5xx para Stripe tentar de novo; 2xx só após persistência, com idempotência garantida. Use eventos finos/snapshot de acordo com versão documentada do SDK; pinar versão em testes.

Disponibilizar `billing.createPortalSession` autenticada, com Customer vinculado, URL de retorno fixa e Stripe Customer Portal para atualizar cartão e cancelar. A UI lê estado do próprio backend, não cookies editáveis.

## Plano de homologação de billing
1. Revisar criação/alteração de schema e backup. Migration de billing isolada, aplicada manualmente ao staging com owner correto; não reutilizar `0006`.
2. Teste Stripe (`sk_test`) no Render: criar checkout USD e, se aprovado, BRL; confirmar vínculo com usuário exato e `premiumAllowed=false` antes da confirmação.
3. Assinatura paga via cartão de testes; webhook `checkout.session.completed` e `invoice.paid`; confirmar uma única assinatura, acesso concedido e nenhum segredo em logs.
4. Repetir mesmo `event.id` e forçar eventos fora de ordem; sem concessão dupla, regressão de status ou duplicidade de Customer. Simular `payment_failed`, `past_due`, `canceled` e recuperação.
5. Testar múltiplas abas e requisições concorrentes na franquia de 20 respostas; limites server-side/idempotência evitam ultrapassar cota. Bloqueio não afeta SRS ou leitura.
6. Testar países/moedas, imposto e cobrança internacional, termos de serviço, LGPD, cancelamento e suporte antes de live. Medir custo por usuário de Groq chat/ASR/Orpheus, Render e Aiven e definir fair use/limite mensal de voz.
7. Ativar `STRIPE_BILLING_ENABLED=true` só após aprovação Deep/fundador; separar testes/produção. **Não trocar para live nem cobrar sem autorização explícita**.

## Critério financeiro de go/no-go
Antes de vender a US$9,90, estimar: número de conversas/mês por pagante, caracteres TTS, segundos ASR, tokens LLM, taxa de pagamento, impostos, estornos e suporte. Margem de contribuição deve ser positiva sob uso P50 e P95; cotas grátis Groq são de homologação e não sustentam 100 assinantes como promessa. Instrumentar uso e orçamento duráveis antes de abrir paywall.

## Referências oficiais
- Stripe Checkout Session: https://docs.stripe.com/api/checkout/sessions/create
- Subscriptions + webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Verify signatures: https://docs.stripe.com/webhooks/signature
- Event types: https://docs.stripe.com/api/events/types
- Stripe Billing customer portal: https://docs.stripe.com/customer-management
- Currency/prices: https://docs.stripe.com/currencies
- Localized prices: https://docs.stripe.com/payments/checkout/localize-prices
- Checkout fulfillment: https://docs.stripe.com/checkout/fulfillment

**Próxima aprovação necessária:** implementação real de billing em PR separado, com revisão de preço, schema de assinatura, limites de custo e política de cancelamento. Este documento não muda comportamento do Lingua.
