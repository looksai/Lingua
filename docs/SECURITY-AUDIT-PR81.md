# Auditoria de segurança — PR #81 — 2026-11-24 / 25 UTC

**Escopo:** revisão de código em `server/community-router.ts`, `server/partner-router.ts`, `server/ads-router.ts`, `shared/portal-access.ts`, migrations DRAFT 0008–0010, workflows de QA e staging Render. Não é pentest externo nem certificação de conformidade. Sem acesso a dados reais.

## Correções implementadas neste ciclo
- **SEC-81-01 (alto para operação, correção)**: designação de moderador de grupo não era passada à função `canUsePortal`; a função exigia `communityRole="moderator"` e bloqueava mesmo uma atribuição válida. Corrigido apenas após consulta ao vínculo server-side. Casos negativos: atribuição sem Club, Club sem vínculo ao grupo, vínculo em outro grupo, grant revogado.
- **SEC-81-02 (médio, correção)**: administradores podiam acessar `moderationQueue` privada, mas não viam os grupos privados no painel, impossibilitando realizar a revisão operacional. A listagem e leitura agora reconhecem `ctx.user.role="admin"` originado da sessão do servidor, sem conceder membership Club.
- **QA-81-03 (test fixture, correção)**: teste de moderação não fornecia requisição HTTP sintética usada por `checkRequestOrigin`. O guarda CSRF funcionava e o teste estava incompleto; corrigido e reexecutado.
- **OPS-81-04 (bloqueio de rollout)**: o histórico `drizzle/meta/_journal.json` inspecionado registra apenas 0000–0002. As migrations DRAFT 0008–0010 foram exercitadas por runners dedicados, mas **não constam do journal como migrações gerenciadas**. Não rodar `pnpm db:migrate` nem `db:push` em staging até reconciliar o inventário da base e histórico migratório. Foi adicionado `scripts/staging-migration-inventory-READONLY.sql` para inspeção de metadados sem leitura de dados pessoais.

## Controles preservados
- Fórum e Ads bloqueados por flags desligadas por padrão. Conteúdo de membros inicia em pendência de moderação; anúncios são rotulados como patrocinados.
- Acesso a grupos privados é verificado no servidor por grants ativos, com Academy limitado a grupos permitidos; nenhuma assinatura é inferida do cadastro.
- Parceiro só consulta mensagens de solicitações da própria instituição e equipe autorizada, sem ID, e-mail ou memórias pessoais retornadas na API; revogação de contato fecha a sala para leituras futuras.
- Salas textuais têm escrita sob transação e bloqueio de linha do pedido. Announcements não aceitam redirect externo: público usa destino derivado do slug verificado.
- CI combinado inclui MySQL 8 temporário para privacidade e portal, P0 e Chromium com contas sintéticas.

## Riscos ainda abertos — obrigatórios antes de ativar flags
1. **Concorrência de revogação no chat empresarial:** autenticação/grant/staff são consultados *antes* da transação que bloqueia apenas a solicitação. Testar e, se necessário, implementar bloqueio transacional da identidade/grant na escrita para impedir concorrência entre revogação de membro/funcionário e inserção de mensagem.
2. **Governança de dados:** definir política de retenção, exportação e exclusão de mensagens, pseudônimos, denúncias, preferências e audit log de autorização/consentimento, com aconselhamento jurídico apropriado. Retirar pedido não apaga uma mensagem já vista pela instituição.
3. **Moderadores e parceiros:** criar trilha auditável de publicação/ocultação, regras de suspensão, recurso e denúncia, atribuições de equipe e verificação real de credenciais profissionais; `verificationState=verified` é só aprovação administrativa, não prova de habilitação legal.
4. **Abuso e disponibilidade:** limites duráveis (não apenas memória de processo), quotas, detecção de spam, bloqueio e lista de palavras proibidas, tratamento de conteúdos enganosos, páginas públicas indexáveis e resposta a incidentes.
5. **Pagamento e direitos:** nenhuma emissão de grants vinculada a webhook pago, reembolso, fidelidade, inadimplência ou plano Club foi homologada. Não habilitar checkout comercial ou assinatura corporativa ainda.
6. **Ads:** audiência/anunciantes reais, contrato e pagamento, identificação de anúncios, métricas agregadas, proibição de coleta de mensagens privadas, ranking pedagógico inalterável.
7. **Migrations e staging:** sem confirmação de ledger real nem aplicação de 0008/0009/0010 no Aiven. Realizar backup restaurável e QA em clone descartável de esquema real antes de tocar staging. Não executar scripts no banco de produção.
8. **Visuais e lives:** kit visual não foi integrado pixel-perfect; stream ao vivo ainda não existe e precisa de provedor de mídia externo e moderação própria.

## Render — inventário somente leitura
- Workspace: `My Workspace` (ID `tea-d9g3apb7uimc73e9h5kg`).
- Serviço: `lingua-p1-staging-le7u` (ID `srv-dc0mh2cs728c73ant6e0`).
- Origem: `looksai/Lingua`, branch `main`; autoDeploy desligado. Sem mudança de configuração, secrets, banco ou deploy nesta auditoria.

## Critério de encerramento
Resultados do CI **do HEAD mais recente** devem estar todos verdes; relatório não substitui auditoria independente nem homologação em staging. PR #81 permanece DRAFT; no merge, não confiar no simples status de CI para concluir que o produto é seguro para usuários reais.
