# Stripe + Paywall — Lingua Staging — runbook de homologação

**Estado:** PR #32 **DRAFT**, implementação em branch `feat/stripe-paywall`; **nenhuma cobrança real**, **nenhuma migration 0008 aplicada**, **nenhum deploy com billing ativo**. `STRIPE_BILLING_ENABLED` permanece `false` por padrão. A aprovação de implementação não é autorização para ativação nem para cobrar alunos.

## 1. Implementado na branch

### Backend e dados persistentes
- Esquema Drizzle e DDL `drizzle/0008_billing_staging.sql` com **seis tabelas**: `billingCustomers`, `billingSubscriptions`, `stripeWebhookEvents`, `billingCheckoutAttempts`, `tutorTrialState` e `tutorUsage`. Memória `learnerMemories`, SRS, CSLE e evidência curricular permanecem intactos.
- `server/tutor-entitlement.ts`: **20 mensagens com resposta de IA** ou **72 horas a partir da primeira resposta de IA bem-sucedida**, o que acabar primeiro. Contagem **por conta no MySQL**, não por navegador. Falhas de IA e respostas locais **não consomem** resposta gratuita; o sistema reserva uma vaga antes da chamada e a libera se a geração falhar.
- Serialização por `tutorTrialState.userId FOR UPDATE`; cada mensagem carrega `interactionId` único por usuário, com índice SQL único. Concorrrência entre abas conta reservas pendentes para impedir a vigésima primeira tentativa simultânea; reenvio do mesmo ID não recebe chamada grátis. Reservas abandonadas ficam elegíveis a limpeza após 10 minutos. Nenhum conteúdo de conversa é copiado para `tutorUsage`.
- Falta de schema, segredo de sandbox ou erro de banco **não** dá acesso gratuito ilimitado; aplicação deve responder com falha fechada. Após o limite, `tutor.reply` responde tRPC `FORBIDDEN` com mensagem **`LIMIT_REACHED`**.
- Antes de ASR, TTS, prévia de voz e demonstrações opcionais, o servidor consulta o direito do usuário quando billing está ativo; o limitador técnico por processo continua como backstop. **ASR/TTS não são contabilizados como mensagens do tutor** e seu teto de custo persistente requer estudo adicional para produção.
- Entitlement Premium é calculado **somente no servidor**: associação persistente de Customer→usuário, Price ID autorizada, assinatura `active`, janela corrente e última fatura **paga**. Não há `isPremium` confiável vindo do browser.
- Nenhum redirecionamento de sucesso concede Premium.

### Stripe sandbox
- Checkout de assinatura autenticado com Stripe Customer associado à conta, Price mensal e USD **990 centavos** validados, idempotency key estável por tentativa, proteção contra sessões paralelas e duplicidades.
- Webhook em `POST /api/billing/stripe-webhook` usa **bytes HTTP originais**, assinatura HMAC SHA-256 `Stripe-Signature`, comparação de tempo constante, tolerância temporal e limite de corpo; rejeita evento `livemode:true`.
- Reconciliação Stripe verifica Customer da conta, assinatura e fatura na API, aplica deduplicação por `event.id` na mesma transação da projeção. Falhas temporárias retornam 5xx para Stripe tentar novamente. **Deduplicar webhook não impede dupla cobrança por si só**; a prevenção de sessões duplicadas pertence ao Checkout idempotente e ao próprio Stripe.
- Portal de cliente para gestão e cancelamento: somente via Customer persistido da conta. O frontend usa `billing.createCheckout` e `billing.createPortalSession`; não há rotas novas `stripe.*` inventadas.

### Frontend
- Chat envia `interactionId` por mensagem; status do trial consultado do backend, sem contador confiável no localStorage.
- Ao receber `LIMIT_REACHED`, mostra modal com mensagem do teste encerrado e botão **«Assinar Premium por US$ 9,90/mês»** para Checkout **de teste**. O aviso pode ser fechado; servidor continua bloqueando o tutor.
- `/premium` para contratar/gerir e `/billing/success` para aguardar confirmação de webhook — nunca autoriza acesso por querystring.
- Mudanças pedagógicas da **PR #35** foram preservadas ao sincronizar `main` com a branch #32.

## 2. Migration 0008 — apenas após auditoria, merge e novo backup

O workflow `.github/workflows/staging-aiven-0008-billing.yml` tem `inspect` (somente leitura) e `apply` (seis `CREATE TABLE`). O script:
- exige execução manual de `main`, alvo Aiven exato (host/porta/defaultdb), MySQL 8.4, CA/TLS e `users.id` assinado compatível;
- exige `learnerMemories` **já presente** (`0007` está aplicada), não aceita schema `0008` parcial, reaplicação nem alteração concorrente; 
- bloqueia DDL não pertencente aos seis `CREATE TABLE` esperados, verifica colunas, PK, unicidade `(userId,interactionId)` e zero linhas;
- **MySQL CREATE TABLE não é uma transação de rollback:** se falhar no meio, parar, manter tabelas parciais para análise manual e **não** executar novamente automaticamente.

**O backup anterior à 0007 já não representa o estado atual do banco.** O workflow `staging-aiven-0008-encrypted-backup.yml` realiza um **novo backup pré-0008**, criptografado AES-256 GPG em runner Linux, conferindo a presença da memória. Precisa de `LINGUA_STAGING_BACKUP_PASSPHRASE` forte, arquivo baixado e guardado em 2 locais, senha protegida separadamente e verificação de recuperabilidade. A exportação não substitui o valor de uma restauração de ensaio em MySQL descartável. É proibido executar `apply` sem essa confirmação específica.

Ordem segura **não executar automaticamente**:
1. CI verde, auditoria Deep e decisão do fundador.
2. Fundador cria conta Stripe **TEST** e Price recorrente **USD 9,90 por mês**, testa configurações do Dashboard e credenciais; prepara Render com `STRIPE_BILLING_ENABLED=false`.
3. Após autorização de merge, levar PR #32 a `main` **com billing desligado**; só então workflows 0008 poderão ser executados manualmente de `main`.
4. Fundador roda `staging-aiven-0008-encrypted-backup.yml`; baixa arquivo `.gpg` e mantém cópias e senha separadas. Confirmação usada é `BACKUP_CRIPTOGRAFADO_LINGUA_0008`; a senha nunca é input do workflow.
5. Fundador roda `staging-aiven-0008-billing.yml` com `action=inspect`; se status `absent` e backup verificado, executa `action=apply` com `confirmation=APLICAR_0008_COBRANCA_STAGING_LINGUA` e `backup_confirmation=BACKUP_PRE_0008_GUARDADO_E_VERIFICADO`.
6. Conferir `0008 APPLIED AND VERIFIED` e rodar `inspect` novamente. Só então liberar `STRIPE_BILLING_ENABLED=true` **no staging** e deploy manual.
7. Testar Stripe Checkout + cartão de teste + webhook real; simular 20 respostas e 72h, assinaturas pagas/recusadas, duplicadas, canceladas e duas contas distintas.
8. **Novo parecer antes de qualquer produção real**. Teste de cartão em sandbox não é evidência de operação comercial certificada.

## 3. Configurar as variáveis de ambiente **somente** no Render staging

Obrigatórias para billing test:
- `STRIPE_BILLING_ENABLED=false` até 0008 completa e homologação orientada; depois habilitar **somente explicitamente** com a DB pronta.
- `STRIPE_SECRET_KEY=sk_test_...` (nunca `sk_live_`).
- `STRIPE_WEBHOOK_SECRET=whsec_...` obtida do **endpoint de teste específico** do Stripe.
- `STRIPE_PRICE_USD_MONTHLY=price_...` correspondendo a Price ativa USD **990 centavos/mês**, licença/quantity 1.
- `STRIPE_BILLING_ALLOWED_EMAILS=lista de e-mails de testadores autorizados`.
- `PUBLIC_APP_URL=https://lingua-p1-staging-le7u.onrender.com` exatamente.

**Importante:** o usuário recebe link de Checkout apenas se constar na allowlist de billing. O tutor **também** permanece restrito a `LINGUA_TUTOR_ALLOWED_EMAILS` no staging. Não habilitar o público por engano. Price em BRL é opcional e não é oferecida pela interface inicial. A aplicação falha fechada se `STRIPE_BILLING_ENABLED=true` sem segredos/Price e URL de staging consistentes.

Webhook público para configurar no Stripe **test mode**:
`https://lingua-p1-staging-le7u.onrender.com/api/billing/stripe-webhook`
Tipos monitorados: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Configurar o endpoint para **eventos snapshot v1** compatíveis com a versão fixada `2026-09-30.endive`; não usar thin events sem adaptador.

## 4. QA obrigatório antes de pedir go-live

- **Quota e concorrência:** uma conta com 19 respostas deve aceitar a 20ª; bloqueia 21ª inclusive com duas abas ou múltiplas instâncias, sem reset por logout/browser; expire 72h exatas; falhas de IA não gastam cota; repetição do mesmo interactionId não obtém benefício. **Testes unitários de política já existem**, mas comportamento real de transações SQL exige teste com MySQL 8.4 descartável e depois staging.
- **Pagamento:** Checkout real em Stripe test mode; test card `4242 4242 4242 4242`, simular autenticação adicional/cartão recusado; redirecionamento de sucesso sozinho não concede Premium; webhook pago e fatura paga devem conceder, evento duplicado não deve conceder novamente.
- **Isolamento:** dois usuários/Customers diferentes, webhook com Customer estranho, dados de assinatura de outra conta, tentativas simultâneas, portal apenas do próprio Customer.
- **Assinatura:** cancelamento imediato/fim do período; `past_due`, `incomplete`, invoice falha, mudanças de Price, webhooks fora de ordem; cronograma de reconciliação e refunds/disputas ainda precisam ser auditados.
- **Regressão:** memória aprovada e SRS mantidos antes/durante/depois do pagamento; a quota limita resposta com IA, não elimina dados do aluno, não habilita CSLE.
- **Operação:** custos de Groq/ASR/TTS, latência, rate limits, logs sem payload sensível, restauração do backup e suporte ao cliente.

## 5. Estado de aprovação

Código de integração está sendo **preparado para auditoria final**. O CI verde é necessário, não suficiente. O novo código **não foi executado contra Stripe real em sandbox nem MySQL em staging**; credenciais **não foram conectadas**; esquema `0008` **não foi aplicado**; produto não está monetizando. Não aprovar produção/merge até checklist e fundador/Deep confirmarem sequência.

A aprovação anterior do auditor para usar o adaptador REST HTTPS em vez do SDK oficial foi registrada. A versão API fixada `2026-09-30.endive` precisa ser confirmada na conta e no endpoint de teste com eventos reais.
