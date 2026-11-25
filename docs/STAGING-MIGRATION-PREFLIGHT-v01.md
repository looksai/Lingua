# Lingua — homologação de migrações 0008–0010 (plano operacional, sem execução real)

## Estado conhecido
- **PR #81** compõe cadastro/consentimento (#75) com portal, fórum, parceiros, salas e anúncios (#76–80); branch isolada e feature flags desligadas.
- Render staging confirmado: serviço `srv-dc0mh2cs728c73ant6e0` / `lingua-p1-staging-le7u`, fonte `looksai/Lingua`, branch `main`, auto deploy **OFF**.
- **Não foi possível confirmar por leitura direta a estrutura do Aiven**. Não assumir que staging ou produção já possuem migrações 0008–0010.
- O journal versionado `drizzle/meta/_journal.json` registra somente 0000–0002, embora scripts 0003/0007 sejam usados em QA. Migrar por comando Drizzle genérico sem inventário é risco de divergência.
- 0008, 0009 e 0010 são **DRAFT** e nunca foram aplicadas por esta branch ao Aiven.
- Preços, pagamentos e emissão de grants não foram definidos. Qualquer grant real concedido por SQL fora de fluxo auditável seria um defeito.

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
