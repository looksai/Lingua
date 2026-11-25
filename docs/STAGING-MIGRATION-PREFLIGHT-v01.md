# Lingua — homologação de migrações 0008–0010 (plano operacional, sem execução real)

## Estado conhecido
- **PR #81** compõe cadastro/consentimento (#75) com portal, fórum, parceiros, salas e anúncios (#76–80); branch isolada e feature flags desligadas.
- Render staging confirmado: serviço `srv-dc0mh2cs728c73ant6e0` / `lingua-p1-staging-le7u`, fonte `looksai/Lingua`, branch `main`, auto deploy **OFF**.
- **Não foi possível confirmar por leitura direta a estrutura do Aiven**. Não assumir que staging ou produção já possuem migrações 0008–0010.
- O journal versionado `drizzle/meta/_journal.json` registra somente 0000–0002, embora scripts 0003/0007 sejam usados em QA. Migrar por comando Drizzle genérico sem inventário é risco de divergência.
- 0008, 0009 e 0010 são **DRAFT** e nunca foram aplicadas por esta branch ao Aiven.
- Preços, pagamentos e emissão de grants não foram definidos. Qualquer grant real concedido por SQL fora de fluxo auditável seria um defeito.

## Inspetor automatizado de metadados (NOVO, ainda não executado remotamente)
- `scripts/staging-aiven-readonly-portal-inventory.ts`: usa a proteção de **host/porta/schema exatos** do Aiven já existente, CA/TLS verificado e transação `READ ONLY`; executa apenas `SELECT` em `information_schema`, `SHOW STATUS` e leitura restrita de `id/created_at` do ledger técnico `__drizzle_migrations` quando existir.
- Mostra **somente nomes de tabelas, colunas, tipos, FKs, quantidade de migrações e IDs/timestamps do ledger**. Nenhuma consulta a linhas de usuários, mensagens, histórico de aprendizagem, memória pessoal ou credenciais.
- `.github/workflows/staging-portal-readonly-inventory.yml`: `workflow_dispatch` **somente na `main`**, confirmação manual `INVENTARIO_SOMENTE_LEITURA_LINGUA` e **credenciais exclusivas de inspeção** `LINGUA_STAGING_READONLY_DATABASE_URL` / `LINGUA_STAGING_READONLY_CA_BASE64` (devem ser provisionadas pelo operador; não há fallback para a credencial da aplicação). **Não está ativado nesta PR draft nem foi executado contra o Aiven**.
- `tests/staging-readonly-inventory.test.ts`: garante sanitização e falha fechada sem banco remoto.
- **Least privilege**: a conta precisa ser dedicada e ter somente `USAGE`/`SELECT` (ou `SHOW VIEW` auxiliar) sem `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, `GRANT OPTION` ou roles delegadas. O script usa `SHOW GRANTS FOR CURRENT_USER()` sem registrar sua saída e aborta se detectar privilégios não permitidos; isto não substitui auditoria DBA de contas/roles.
- O inventário do ledger registra o total real via `COUNT(*)` e marca `truncated=true` se a amostra de até 1000 linhas não for completa; nunca confundir amostra com histórico integral.
- Não utilizar o workflow no staging real antes de revisar a PR #81, confirmar novamente o host e o escopo da credencial. O relatório é **inventário, não autorização para migrações**.

## Fase A — pré-condições em modo estritamente leitura
1. Identificar, fora de logs públicos, **qual banco de staging** será usado. Não confiar somente no nome do serviço Render; o alvo real vem da credencial de banco.
2. Designar usuário MySQL **somente SELECT no information_schema** (ou escopo equivalente de metadados), sem DDL nem leitura de linhas de alunos.
3. Executar exclusivamente `scripts/staging-migration-inventory-READONLY.sql` contra o **banco de staging identificado**, após conferir host e database. Não coletar ou publicar segredos, e-mails, memórias ou mensagens.
4. Obter o histórico real das migrações (journal, workflow de aplicação, `__drizzle_migrations` ou outro ledger). Se não houver evidência verificável, **parar**.
5. Confirmar backup criptografado recuperável e teste de restauração de um conjunto descartável. Existência de arquivo de backup sozinha não prova recuperação.

**Saídas esperadas:** identificador não sensível do banco, inventário de tabelas/colunas/chaves, ledger consistente, evidência de backup recuperável e responsável técnico pela aprovação.

## Fase B — ensaio isolado antes do staging
1. Criar clone **sem dados pessoais** ou cópia de estrutura do banco com usuários sintéticos. Para dados de estudantes, não copiar dados reais sem processo próprio de proteção/anonimização aprovado.
2. Reproduzir a cadeia de migrações que o banco efetivamente necessita. Não reaplicar 0003/0007 quando já existirem; não aplicar 0008 se a tabela já estiver presente.
3. Ensaiar 0008 -> 0009 -> 0010, validando as FK, a ordem de criação/ALTER, índices, defaults e direitos de acesso sem backfill.
4. Comparar schema esperado (Drizzle + SQL) com informação do clone. No CI há `scripts/qa-portal-schema-invariants.ts` (seguro apenas para banco `lingua_portal_qa` local).
5. Testar conta anterior sem consentimento, conta nova consentida sem Club, concessão/revogação sintéticas de Academy/Club, moderador, multiempresa, anúncios não aprovados e salas revogadas.
6. Testar falha parcial **sem assumir DDL transacional**: em MySQL, CREATE/ALTER podem efetivar mesmo que um script subsequente falhe. Não usar rollback com DROP TABLE contendo dados de membros.
7. Criar plano de correção **forward-only** e plano para desligar flags/reverter código, preservando registros e consentimentos em caso de incidente.

## Fase B.1 — validação de falha parcial e invariantes (CI)
- O ensaio em `scripts/qa-portal-mysql.ts` agora cria uma tabela sintética temporária, injeta uma segunda instrução DDL inválida e comprova que a primeira criação continua presente. Em seguida, limpa **apenas essa tabela sintética no banco descartável local**. Isso demonstra por que não se pode assumir rollback transacional de uma sequência de DDL no Aiven.
- `scripts/qa-portal-schema-invariants.ts` confere chaves estrangeiras, unicidade dos slugs públicos, defaults de moderação (`pending`), anúncios com status inicial `pending` e ausência de organizações/grants/publicidade criadas automaticamente.
- O teste continua limitado a `lingua_portal_qa` em loopback, sem credenciais de staging.
- Em caso de falha parcial real, registrar o último DDL comprovadamente aplicado, inspecionar `information_schema`, comparar com o manifesto esperado, preservar linhas existentes e produzir uma migração corretiva aprovada. **Nunca retomar cegamente o arquivo inteiro nem fazer DROP de tabelas com dados.**

## Ensaio sintético do ciclo criptografado (sem Aiven)
- `scripts/qa-disposable-backup-restore.sh` agora exercita a sequência **mysqldump → gzip → GPG AES-256 → validação de integridade → restauração em outro banco MySQL temporário**; rejeita senha incorreta e compara contagens de tabelas e registros relevantes.
- A senha é criada aleatoriamente somente na execução CI; **nunca usa o segredo verdadeiro do backup do fundador**. O arquivo SQL em texto claro não é persistido em disco nem anexado a logs; o arquivo temporário criptografado é removido ao terminar.
- A comparação da restauração usa contagem de linhas **e SHA-256 de exportações canônicas das linhas sintéticas** nas tabelas selecionadas. Um controle negativo altera o título de um tópico restaurado, sem mudar a quantidade de linhas, e exige que o hash detecte essa alteração. Dados SQL não são impressos nem persistidos pelos verificadores de hash.
- Esta evidência é de **rotina sintética**, não prova que o arquivo `lingua-pre-0007.sql.gz.gpg` real pode ser descriptografado ou restaurado. Não publicar, baixar nem subir backups reais para GitHub Issues/PRs; a restauração de backup verdadeiro requer ambiente isolado e autorização específica.
- MySQL 8.0 em CI não é MySQL 8.4 Aiven; conferir compatibilidade de versão e `mysqldump` durante homologação real.

## Fase C — decisão formal de liberar staging
- Aprovação independente da PR e do script de migração.
- Recurso de backup restaurável e plano de resposta a falhas.
- Staging vinculado à branch/commit verificados, com flags OFF e conta de testes exclusivamente sintética.
- Aplicação da migração por procedimento auditável **e sequencial**, validando esquema após cada etapa.
- Somente depois, ativação **uma flag por vez**, com revisão e evidências para cada componente; sem anúncios ou empresas reais até política comercial e jurídica aprovada.

## Proibições nesta entrega
- Não usar `pnpm db:push` ou `pnpm db:migrate` genérico em Aiven.
- Não misturar staging com produção nem aplicar o banco sem inventário e backup ensaiado.
- Não habilitar `LINGUA_PORTAL_COMMUNITY_ENABLED`, `LINGUA_PORTAL_PARTNER_CONTACT_ENABLED` ou `LINGUA_PORTAL_ADS_ENABLED`.
- Não liberar ao parceiro identidade, histórico do Naruto ou dados de alunos por login empresarial.
- Não prometer que checklist, CI ou integração em MySQL sintético sejam aprovação de segurança de produção.

**Status:** plano e testes automatizados prontos para avaliação; **nenhuma alteração em banco remoto ou deploy**.
