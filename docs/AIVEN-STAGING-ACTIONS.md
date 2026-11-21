# MySQL staging Aiven — execução segura pelo GitHub Actions

**Estado:** proposta na branch `fix/p1-staging-migration-runner`. Não foi executado teste real ou migração no Aiven; não foi adicionado segredo. Não usar a senha antiga enviada por chat: ela foi redefinida pelo fundador.

## Motivo
O **Render Free não fornece shell ou SSH**, então o comando `pnpm drizzle-kit push` no console Render não é uma alternativa disponível. `drizzle.config.ts` também não herda automaticamente o CA usado pelo backend, e `push` pode aplicar diferenças não revisadas. O fluxo manual abaixo utiliza os arquivos SQL auditados e CA verificado do runtime.

## Preparação, pelo navegador
1. Acessar [Secrets de Actions do repositório Lingua](https://github.com/looksai/Lingua/settings/secrets/actions), com acesso do fundador.
2. Criar **Repository secrets**:
   - `LINGUA_STAGING_DATABASE_URL`: URL **atual** da Aiven (com senha redefinida), host `mysql-180b49ae-lingua.a.aivencloud.com`, porta `14403`, schema `defaultdb`. Não enviar valores por chat.
   - `LINGUA_STAGING_CA_BASE64`: Base64 UTF-8 integral do certificado `ca.pem` emitido para o projeto. Base64 não é criptografia, mas evita problemas com linhas múltiplas em secrets.
3. **Não configurar** esses secrets em fork ou PR. O workflow só dispara manualmente a partir de `main`, usando `workflow_dispatch`. Não faça rerun de jobs de migração.
4. Depois do merge deste PR (com autorização do fundador), ir em [Actions](https://github.com/looksai/Lingua/actions), selecionar **Lingua Aiven staging (manual and guarded)** → **Run workflow** → branch **main** → `action=inspect`. Deixar `confirmation` vazio.
5. Observar somente logs sanitizados: versão MySQL 8.4.x, TLS ativo, schema correto, número e nomes de tabelas. `inspect` é **somente leitura**.
6. Caso o banco esteja vazio, o fundador poderá aprovar executar novamente com `action=migrate` e a frase de confirmação **exata** `APLICAR_0000_0001_0002_SOMENTE_LINGUA`.
7. A migração aplica somente `0000_initial_users.sql`, `0001_great_maggott.sql` e `0002_p0_review_idempotency.sql`, em ordem, e valida o índice único de revisão. Não importa dados nem cria estudantes.
8. **Se o SQL falhar depois de começar**, interromper. MySQL DDL tem commit implícito e pode ficar parcial; a rotina se recusa a repetir sobre banco não vazio. Não usar `drizzle-kit push` para tentar consertar.
9. O deploy Render só poderá começar depois de validar o banco e registrar o OAuth WebDev, sempre serviço **Free**, sem novos recursos pagos.

O script recusa outro hostname, outra porta ou schema. A existência de um banco exclusivo para Lingua não garante que esteja vazio — por isso a inspeção vem antes.

Nota sobre a Aiven: o banner de 30 dias e US$ 50 representa **trial da conta**, não comprova que a instância MySQL esteja num tier Free. Consultar **service → Overview → Plan** no painel Aiven. A Aiven aposentará serviços MySQL Free remanescentes em 21/12/2026: https://aiven.io/docs/products/mysql/howto/mysql-free-tier-migration-options .
