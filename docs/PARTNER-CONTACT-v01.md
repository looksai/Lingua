# Lingua Partners — contato voluntário e área institucional (v0.1)

## Código implementado nesta PR (rascunho)
- Página institucional pública por slug para organizações com `verificationState=verified`, sem divulgar organizações pendentes ou suspensas.
- Contato **iniciado pelo próprio membro** mediante escolha explícita por solicitação, texto mínimo e limite de tamanho. Necessário grant Academy ou Club ativo, não basta login.
- O destinatário recebe **somente a mensagem enviada** e metadados da solicitação. A resposta da API da empresa não contém ID do aluno, email, telefone, memórias, profissão, histórico escolar ou dados de terceiros.
- Área privada da equipe, listando apenas as empresas atribuídas ao funcionário ativo. Proprietário pode propor nova descrição; proposta fica pendente de revisão e a página pública não se altera até aprovação por administrador.
- Fila administrativa para aprovar/rejeitar novos textos institucionais.
- Cada membro pode acompanhar e retirar mensagens abertas. A retirada remove a mensagem de consultas futuras da caixa da empresa, **mas não reverte leituras que já ocorreram**.
- Equipes de parceiros não recebem grants Club/Academy implicitamente.
- Sem autenticação por email de terceiro, nenhuma campanha automatizada ou geração de contatos em massa.

## Governança
- `LINGUA_PORTAL_COMMUNITY_ENABLED=true` **e** `LINGUA_PORTAL_PARTNER_CONTACT_ENABLED=true` são necessários para disponibilizar a API. A segunda flag é desligada por padrão.
- As organizações e seus funcionários devem ser cadastrados/atribuídos por fluxo administrativo auditável antes da ativação. Nenhuma empresa fictícia criada.
- **Não representa sala de atendimento bidirecional.** A caixa de entrada atual registra pedidos de contato e permite encerrar; resposta institucional, agendamento e videoconferência são trabalho futuro.
- Aprovação administrativa de página **não garante autorização migratória, habilitação profissional ou respaldo do Lingua**. A verificação legal de credenciais depende do país e do regime de atuação.
- A data de autorização é registrada com a solicitação; a organização não pode acessar dados da conta sem nova base legal e funcionalidade específica.
- Nada de valores, faturas, comissão, cupons, anúncios, Stripe ou transferência de dados de aluno.
- A migração `drizzle/0009_portal_community_DRAFT.sql` ganhou `draftDescription` e estado `withdrawn`; ainda não aplicada. **Não aplicar duas versões diferentes do mesmo SQL no mesmo banco**. Revisar conjunto de PRs #75 → #76 → #77 → esta PR antes de staging.
- O consentimento para memória educacional do Naruto nunca é usado como autorização de contato comercial.

## Pendências obrigatórias antes de ativação
- Políticas/avisos de privacidade para mediação de contato, retenção e exclusão; revisão jurídica e de conformidade profissional.
- Testes de revogação e isolamento em MySQL de staging, incluindo mensagens em trânsito e contas de múltiplas organizações.
- Proteção antispam compartilhada, quotas, denúncias, bloqueio de abusos e registro auditável de alterações de perfil.
- Projeto de comunicação segura e consentida de resposta da empresa, somente após criar mecanismo de conversa/atendimento; não exibir emails por padrão.
- Gate técnico da PR #75 (migração 0008), migração 0009 e plano de rollout, com feature flags desligadas até aprovação.

## Testes
- `server/partner-router.test.ts`: fail-closed e consentimento obrigatório.
- `scripts/qa-portal-mysql.ts`: cenários sintéticos com MySQL 8 descartável, incluindo isolamento de staff de empresas diferentes, concessão de membro, autorização, edição revisável, revogação e acesso público aprovado.
- Workflows P0 e QA MySQL têm execução condicionada à abertura/atualização da PR; validar HEAD final.

**Sem alteração em produção, staging, CSLE ou preços nesta etapa.**
