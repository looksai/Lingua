# Staging Aiven — execução segura da migration 0006 (manual)

**Status:** migration **APLICADA E VERIFICADA** no staging Aiven em 22/11/2026, via workflow de GitHub Actions protegido `ops/aiven-0006-placement`, run [45084116478](https://github.com/looksai/Lingua/actions/runs/45084116478). A inspeção anterior [45083982437](https://github.com/looksai/Lingua/actions/runs/45083982437) confirmou ausência das duas tabelas e identidade TLS. O job de aplicação informou `0006 APPLIED AND VERIFIED`: colunas, índices, FKs e contagens iniciais zero. **A existência de snapshot/backup da conta Aiven não foi verificada por este workflow**; não inventar confirmação. Os passos abaixo ficam preservados como runbook de auditoria/reprodução em ambiente apropriado; não executar novamente só por estarem descritos.

**Alvo único:** MySQL Aiven de *staging* já utilizado por `lingua-p1-staging-le7u` no Render, TLS com CA verificada. **Proibido** aplicar em produção, outro projeto, Nordstar ou banco sem identidade verificada. Não ler/copiar/colar segredos em chat, PR ou logs. Nunca usar `pnpm db:push`.

## A. Antes de qualquer CREATE TABLE

1. Confirmar em ambiente seguro que a conexão é o mesmo `DATABASE_URL` do staging (não exibir valor) e que a cadeia TLS verifica CA+hostname.
2. Fazer snapshot/backup restaurável pela Aiven e registrar a referência privada, data, destino e responsável. DDL do MySQL faz commit implícito: não depende de `ROLLBACK`.
3. No cliente SQL autenticado com TLS, executar apenas consultas de pré-verificação:

```sql
SELECT DATABASE() AS target_database, @@hostname AS db_host, VERSION() AS db_version;
SHOW TABLES LIKE 'users';
SHOW TABLES LIKE 'learnerProfiles';
SHOW TABLES LIKE 'introductoryResponses';
SHOW TABLES LIKE 'learnerPlacementAnswers';
SHOW TABLES LIKE 'learnerPlacementPlans';
SHOW CREATE TABLE users;
SHOW CREATE TABLE learnerProfiles;
SHOW CREATE TABLE introductoryResponses;
```

**Parar** se as tabelas iniciais não existirem, se qualquer tabela da migration já existir, ou se o esquema/owner/ferramentas indicarem drift. Não aplicar `IF NOT EXISTS` para mascarar drift. Verificar `users.id` inteiro e as chaves de `learnerProfiles.userId` estabelecidas na `0005_onboarding_jarvis.sql`.

## B. Executar

Após essas verificações, executar exatamente o conteúdo revisionado de `drizzle/0006_placement_staging.sql` no ambiente identificado. Ele cria **somente** `learnerPlacementAnswers` (chave única userId+taskId) e `learnerPlacementPlans` (um plano provisório versionado por usuário), ambas com `FOREIGN KEY userId REFERENCES users(id) ON DELETE CASCADE`.

Usar cliente MySQL/Aiven já autorizado. Não publicar strings de conexão ou certificados; não executar comandos de shell de terceiros.

## C. Verificar

```sql
SHOW CREATE TABLE learnerPlacementAnswers;
SHOW CREATE TABLE learnerPlacementPlans;
SELECT COUNT(*) AS initial_answers FROM learnerPlacementAnswers;
SELECT COUNT(*) AS initial_plans FROM learnerPlacementPlans;
```

Exigir contagem inicial zero, tipos e índices correspondentes à migration, FKs corretas e nenhuma alteração em `users`, `learnerProfiles`, SRS, CSLE ou dados existentes. Registrar o resultado sem informações pessoais.

## D. Ordem de publicação

**Somente após migração Aiven aplicada e verificada**: liberar PR #23 do draft, conferir CI do HEAD rebaseado, merge na `main`, deploy **manual** no Render, confirmar SHA/Live/health check, testar 3 respostas com conta adulta e exemplos fictícios e a persistência do plano. Outros usuários não devem ser habilitados: acesso segue em allowlist.

Se a criação da primeira tabela falhar, investigar antes de tentar a segunda; se a segunda falhar após criação da primeira, não fazer `DROP` sem avaliar se houve uso e autorizar plano de recuperação. Para reversão pós-deploy, primeiro desabilitar a feature/reverter o deploy; somente considerar remover tabelas após backup e inspeção de dados.

## E. Declaração de conclusão exigida

Operador responsável registra, sem credenciais: ambiente Aiven confirmado, backup confirmado, `0005` verificada, `0006` executada, `SHOW CREATE TABLE` de ambas aprovado, contagens iniciais zero, horário e resultado. Sem isso a migration **não está concluída**, mesmo que o CI esteja verde.

> Notas: três amostras de texto NÃO certificam CEFR nem pronúncia. Nenhum novo dado dessa sondagem deve ser usado como evidência oficial, SRS ou CSLE automaticamente.
