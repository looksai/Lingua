# LINGUA — RETOMAR AQUI (checkpoint de contexto)
**Atualizado:** 2026-11-25 (America/Fortaleza)  
**Projeto:** `looksai/Lingua` (aplicativo), motor separado `looksai/CSLE-Engine`  
**Status:** desenvolvimento e auditoria em GitHub; **nenhum merge, deploy ou migração remota autorizado por este checkpoint**.

> **Este arquivo é o ponto oficial de continuidade para uma nova conversa.** Primeiro ler este documento e os links abaixo, conferir o estado ATUAL das PRs no GitHub e prosseguir do último commit verificado. Não assumir que uma execução de CI antiga se aplica a novos commits.

## 1. Onde paramos, exatamente

- **PR integradora:** [#81](https://github.com/looksai/Lingua/pull/81), **DRAFT**, head branch `integration/privacy-portal-safe-combined-v01`, base `main`.
- **HEAD funcional anteriormente verificado, antes deste checkpoint documental:** `5ca872eed985214a5fa8a1fff1a218ccb076aa33`.
- **CI desse commit, 4 verdes**:
  - [P0 TypeScript/testes/build](https://github.com/looksai/Lingua/actions/runs/45538892300)
  - [Privacidade MySQL descartável](https://github.com/looksai/Lingua/actions/runs/45538892415)
  - [Portal/migrações/MySQL descartável](https://github.com/looksai/Lingua/actions/runs/45538892296)
  - [Chromium TutorChat sintético](https://github.com/looksai/Lingua/actions/runs/45538892280)
- **Atividade imediata:** pré-homologação das migrações 0008–0010, com esquema MySQL descartável, invariantes de FK, estados `pending`, slugs únicos, contas legadas não convertidas automaticamente e ensaio de falha parcial de DDL.
- **Bloqueio atual:** ainda NÃO foi obtido/inspecionado diretamente o inventário real do MySQL Aiven de staging, ledger real de migrações ou restauração comprovada de backup. Não é seguro executar migration remota ou deploy.
- **Read-only Render verificado na auditoria:** workspace `My Workspace`, staging `lingua-p1-staging-le7u` / `srv-dc0mh2cs728c73ant6e0`, ligado ao ramo `main`, autoDeploy OFF. Confirmar novamente antes de qualquer ação.
- **Nenhum preço comercial aprovado.** Clube, empresas, descontos e comissões são hipóteses de negócio, não constantes de produção.

## 2. Mapa das PRs e entregas

| PR | Escopo | Situação informada antes deste checkpoint |
|---|---|---|
| [#75](https://github.com/looksai/Lingua/pull/75) | Cadastro com aceite do serviço e escolha opcional de memória pessoal; migration 0008 | Draft; incorporada na #81 |
| [#76](https://github.com/looksai/Lingua/pull/76) | Portal público Lingua e navegação por país/interesses | Draft; incorporada na #81 |
| [#77](https://github.com/looksai/Lingua/pull/77) | Club/fóruns/grupos, ACL, moderação, migration 0009 | Draft; incorporada na #81 |
| [#78](https://github.com/looksai/Lingua/pull/78) | Página institucional verificada, funcionário, solicitação voluntária do membro | Draft; incorporada na #81 |
| [#79](https://github.com/looksai/Lingua/pull/79) | Salas privadas textuais associadas a solicitações; revogação e isolamento | Draft; incorporada na #81 |
| [#80](https://github.com/looksai/Lingua/pull/80) | Lingua Ads V1 contextual e texto patrocinado, revisão administrativa, migration 0010 | Draft; incorporada na #81 |
| [#81](https://github.com/looksai/Lingua/pull/81) | Consolidação de #75–80 e auditoria de segurança, testes integrados, preflight das migrações | **Ponto único de trabalho atual**, DRAFT |

**Não mergear as PRs empilhadas individualmente sem revisar sobreposição de commits e migrações.** A #81 integra os arquivos compartilhados `drizzle/schema.ts` e `server/routers.ts`.

## 3. Código e documentação a abrir primeiro

- `docs/INTEGRATION-PR75-80-READINESS.md` — arquitetura integrada, dependências e gates.
- `docs/SECURITY-AUDIT-PR81.md` — falhas corrigidas, riscos abertos e inventário Render.
- `docs/STAGING-MIGRATION-PREFLIGHT-v01.md` — procedimento de staging: inventário → clone descartável → backup restaurável → migração sequencial.
- `scripts/staging-migration-inventory-READONLY.sql` — **consulta somente de metadados** para banco real, apenas com usuário read-only e alvo confirmado.
- `scripts/qa-portal-mysql.ts`, `scripts/qa-portal-schema-invariants.ts` e `scripts/qa-privacy-mysql.ts` — QA em MySQL sintético.
- `drizzle/0008_privacy_preferences_DRAFT.sql`, `drizzle/0009_portal_community_DRAFT.sql`, `drizzle/0010_partner_ads_DRAFT.sql` — **não aplicadas remotamente**.
- `drizzle/meta/_journal.json` — até a última inspeção registra somente 0000–0002, apesar de outros scripts SQL para 0003/0007 etc. **Não usar `db:migrate` ou `db:push` genericamente no Aiven.**
- `server/community-router.ts`, `server/partner-router.ts`, `server/ads-router.ts`, `shared/portal-access.ts` — ACL, ações privadas e publicidade.
- `docs/PARTNER-CONTACT-v01.md` e `docs/LINGUA-ADS-v01.md` — escopo de produtos comerciais.

## 4. Decisões de produto do fundador — preservar

**Nome:** somente **Lingua**. Direcionamento principal: adultos 25+ planejando imigração, emprego internacional, ensino de idiomas e exames (ex.: IELTS). Não construir gamificação infantil; público prioritário inclui profissões técnicas e carreiras internacionais.

**Estrutura:** um portal com áreas **públicas** para descoberta, conteúdo e pesquisa, e **privadas** para fórum, grupos e participação no Club. Academy ensina línguas com o Naruto (tutor ativo e plano pedagógico); Club é uma comunidade relevante por direito próprio; Partners reúne organizações e consultorias; Careers/oportunidades são visão futura (não confundir com funcionalidades concluídas).

**Modelo comercial ainda EM ABERTO:**
- Club: hipótese de **pagamento único** (valores aventados R$500/R$699/R$999; NÃO escolher nem implementar preço neste momento). Entrada acessível facilita massa crítica, enquanto interação pode ser organizada em grupos menores por destino e assunto.
- Academy: assinatura de idioma; alunos têm acesso comunitário **limitado** enquanto elegíveis e possível bônus de acesso independente ao Club após 12–18 meses de permanência, ainda sem política contratual aprovada. Sem grant automático no cadastro.
- Empresas parceiras: **página exclusiva + grupo próprio e canal de captação voluntária**, com **assinatura recorrente em USD/EUR**, preço a decidir depois. Publicidade paga e lives seriam serviços adicionais opcionais, também sem preços aprovados.
- Indicação: cliente com desconto e parceiro com **10% de comissão**; percentual do desconto, incidência temporal/recorrência, base líquida e contratos AINDA devem ser aprovados antes de programar pagamentos. Não inventar ativação de cupom.
- Privacidade: parceiros **não compram listas de alunos** nem recebem memórias, histórico do Naruto, e-mail ou identificadores de conta por associação institucional. O próprio interessado inicia contato e autoriza a mensagem. Anúncio patrocinado é claramente rotulado e contextual, não usa perfis sensíveis ou chats privados para segmentação.
- Lingua Live e videoconferência: **ideia aprovada para desenvolver no futuro**, transmissão real NÃO implementada; usar provedor de mídia separado do servidor do tutor, com quotas/custos/moderação.

**Engenharia pedagógica:** `looksai/CSLE-Engine` é módulo separado e vendor-agnóstico; o aplicativo Lingua governa consentimento, currículo oficial e evidências; o motor pode propor/adaptar mas não certificar unilateralmente. Não usar popularidade/social/ads para modificar mérito pedagógico.

**Visual:** o fundador aprovou uma direção premium adulta, com fundo/hero ilustrado e componentes separados para front-end (kit visual desenvolvido em conversa anterior). O código atual não reivindica reprodução pixel-perfect; confirmar/obter os assets corretos antes de integrar, nunca inventar métricas de usuários, parceiros ou vagas.

## 5. Segurança já endereçada na #81

- ACL de moderadores corrigida: vínculo específico ao grupo + Club ativo; admin de sessão pode revisar grupos privados sem comprar Club.
- Sala textual privada: checagem de membros/funcionários e organização verificada; envio revalida sob transação e lock de linha antes de inserir mensagem. Testes de revogação adicionados.
- Publicações/respostas/anúncios começam como **pendentes** e dependem de moderação/admin. Publicidade redireciona apenas ao perfil institucional interno construído de slug validado.
- Migrações não concedem direitos Club, consentimento ou memória pessoal automaticamente a usuários preexistentes. Testes de conta legada e FKs incluídos.
- Falha DDL é ensaiada em MySQL descartável: não presumir rollback em CREATE/ALTER já efetuado. Recuperação de falha parcial deve ser forward-only, revisada, sem apagar dados de membro.
- Flags OFF: `LINGUA_PORTAL_COMMUNITY_ENABLED`, `LINGUA_PORTAL_PARTNER_CONTACT_ENABLED`, `LINGUA_PORTAL_ADS_ENABLED`.

## 6. Pendências de engenharia (ordem recomendada)

1. **Verificar o HEAD real, resultados de CI e estado de #75–#81** no GitHub. Se o checkpoint for novo commit, distinguir testes do HEAD de testes do commit anterior.
2. **Inventário read-only real do staging Aiven** somente após identificar inequivocamente o banco e obter uma credencial adequada; não abrir dados pessoais e não imprimir segredos. Se o conector não permitir leitura segura, documentar bloqueio em vez de simular resultado.
3. **Backup restaurável:** conferir artefatos e execução de restauração para clone sintético/sem dados privados; existência de backup criptografado não prova recuperabilidade.
4. **Reconciliar migrações Drizzle:** journal versionado 0000–0002 versus scripts 0003, 0007, 0008–0010. Comparar schema real com manifestos, preparar procedimento de DDL auditável; não executar em remoto ainda.
5. **Revisão independente** de contas diferentes, antiabuso e limites duráveis, auditoria/moderação, consentimento e retenção/exclusão; testes simultâneos de revogação vs. escrita/leitura em salas.
6. Somente após gates e autorização específica: staging com contas sintéticas, flags OFF → ativação por módulos. Não habilitar produção por efeito colateral.
7. Futuro: painel para grupos institucionais, contato/agenda mais avançados, ads com orçamento/contrato/métricas agregadas, Lingua Live separado, identidade visual definitiva, cobrança e direitos apenas após preços definidos.

## 7. Restrições inegociáveis para o próximo agente

- O fundador permite desenvolvimento/autonomia de engenharia e pede atualizações contínuas no GitHub, mas **não autoriza automaticamente operação destrutiva no Aiven, deploy ou merge**. Fazer apenas quando ambiente, backup, riscos e aprovação estiverem claros.
- Fazer commits pequenos e PRs auditáveis; manter auditoria crítica independente. Não declarar “pronto para produção” com base apenas em CI.
- Nunca publicar credenciais, backup passwords, connection strings, tokens ou dados de alunos em documentação/issues/logs.
- Manter os preços em aberto e preservar as decisões comerciais acima. Não atribuir faturamento ou usuários reais fictícios.
- Não perder a autonomia do Naruto e do CSLE.
- Ao começar uma conversa nova, solicitar simplesmente: **“Continue o Lingua. Leia o arquivo `CONTINUE-HERE-LINGUA.md` na branch `integration/privacy-portal-safe-combined-v01` do repositório `looksai/Lingua`; confira a PR #81 e retome do próximo gate sem deploy.”**

## 8. Nota de auditoria histórica

A revisão de 2026-11-25 verificou quatro workflows verdes no commit `5ca872ee` e registrou a revisão da PR #81. Os novos commits de documentação/checkpoint não alteram a autorização de produção, mas exigem nova checagem de estado se houver qualquer modificação de código. Este documento é registro de continuidade, não um substituto de ler a árvore atual nem uma declaração de CI no novo HEAD.
