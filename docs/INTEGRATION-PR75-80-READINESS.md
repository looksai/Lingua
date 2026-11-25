# Lingua — Integração #75–#80, sem ativação

## Contexto
Esta branch é uma composição auditável das PRs de privacidade e portal. **Não foi mesclada à main e não foi implantada no Render ou no Aiven.** Sem preços, habilitação de contas, anúncios reais ou empresas reais.

### Dependências e ordem
1. **PR #75**: cadastro, aceite de serviço, memória pessoal opcional; migration `0008_privacy_preferences_DRAFT.sql`. Atenção: contas anteriores não recebem aceite ou memória por inferência.
2. **PR #76**: portal público, rotas e descoberta.
3. **PR #77**: grupos públicos/privados, direitos de acesso, moderação e migration `0009_portal_community_DRAFT.sql`.
4. **PR #78**: páginas institucionais, solicitações de contato por iniciativa do membro, painel e verificação administrativa de conteúdo.
5. **PR #79**: sala privada bidirecional vinculada a solicitação, fechada quando o membro retira ou a empresa encerra.
6. **PR #80**: anúncios patrocinados contextuais, textos aprovados pelo administrador e migration `0010_partner_ads_DRAFT.sql`.

## Conflitos reconciliados
- `drizzle/schema.ts`: adiciona `learnerPrivacyPreferences` da #75 sem perder as tabelas do portal, salas e publicidade.
- `server/routers.ts`: incorpora os parâmetros obrigatórios `serviceAccepted` e `personalMemoryEnabled` ao signup sem perder `community`, `partners` e `ads`.
- Os demais arquivos da #75 foram transferidos **apenas se** o arquivo no ramo portal estivesse inalterado frente à main, evitando sobrescrita silenciosa.

## Tests desta branch
- `scripts/qa-privacy-mysql.ts`: cadastro, preferência pessoal, revogação de memória, efeito de resposta tardia e conta legada num MySQL descartável.
- `scripts/qa-portal-mysql.ts`: aplica a cadeia `0000 → 0003 → 0007 → 0008 → 0009 → 0010` num MySQL descartável; testa cadastro consentido sem ganho de direitos Club, privacidade entre membros, moderação, diretório, múltiplas empresas, mensagens privadas e publicidade.
- P0: typecheck, testes e build; Chromium: regressão de chat do tutor com dados sintéticos.
- **A execução verde de cada PR isolada não substitui um CI verde desta integração.** Conferir os resultados do HEAD da #81.

## BLOQUEIOS DE ATIVAÇÃO (não avançar automaticamente)
- **Banco**: confirmar o ambiente de staging por ID, snapshot recuperável, inventário de migrations realmente aplicadas e possível drift; preparar SQL idempotente/operacional e plano de rollback. `0008/0009/0010` ainda são rascunhos.
- **Direitos comerciais**: não existe emissão real de grants por pagamento verificado nem política final de acesso Academy/Club, cancelamento, reembolso e 12–18 meses. Nunca conceder Club apenas por cadastro, papel empresarial ou cupom.
- **Moderação e segurança**: ações administrativas com trilha auditável, denúncias, remoção e recurso, antispam distribuído, limites de requisições, bloqueio de contas, upload seguro, retenção e exportação/eliminação de dados.
- **Parceiros**: verificação regulatória de prestadores (não se confunde com simples aprovação administrativa), controle de empregados, regras de publicidade, declaração patrocinada, tratamento de consentimento para contato e encerramento seguro de salas.
- **Comercial**: preços e planos ainda abertos; não ligar Stripe a grants, anúncios ou comissão sem regras aprovadas e testes de webhook/reversão.
- **Video/Live**: vídeo e transmissão não foram implementados, e não devem ser executados no mesmo processo do tutor; a infraestrutura de streaming precisa de orçamento, quotas e moderação.
- **Educação/CSLE**: o tutor e memória autorizada seguem separadamente governados; nenhuma publicidade pode alterar recomendações pedagógicas ou evidência oficial de aprendizagem.

## Flags explicitamente OFF
- `LINGUA_PORTAL_COMMUNITY_ENABLED`
- `LINGUA_PORTAL_PARTNER_CONTACT_ENABLED`
- `LINGUA_PORTAL_ADS_ENABLED`

## Próxima ação segura
Aguardar CI verde combinado. Fazer auditoria independente de arquitetura e segurança, depois preparar migrações ensaiadas em banco descartável compatível com esquema real. **Nenhuma ação em Render/Aiven/main sem autorização específica para a mudança de ambiente, depois de identificar o ambiente correto.**
