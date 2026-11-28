# Comunidade — porta de homologação do laboratório de moderação

Atualizado em 28/11/2026. PR #125 / `feat/exam-writing-catalog`. Não implica aprovação para produção.

## Contrato funcional e de segurança

- `commercialLab.achievementFeed`: consulta autenticada, limite de 1 a 20 itens por página, cursor composto de data e ID, `Cache-Control: private, no-store`. Não existe rota pública. Conta sem assinatura ativa ou suspensa não acessa. Antes da paginação o SQL exclui autores sem assinatura vigente, bloqueios bilaterais, suspensão, revogação, privacidade desativada e ocultação administrativa; antes de devolver os itens o repositório confere novamente as permissões e a revisão da publicação. Somente título/ID da conquista e horário são exibidos; nenhuma resposta, fala, avaliação IELTS ou evidência curricular.
- `commercialLab.reportPublication`: origin e identidade validadas, throttling, apenas conquistas do catálogo, revisão exata e publicação ainda ativa. Denúncia não remove conteúdo automaticamente. A combinação denunciante, autor, conquista e revisão é única no banco, inclusive sob concorrência. Não é possível denunciar a própria conquista, uma publicação oculta, revogada ou invisível.
- `commercialLab.myCommunityReports`: lista privada e paginada, exclusivamente da conta autenticada, inclusive quando expirou o plano; não devolve informações de outros denunciantes nem dados internos do administrador.
- Administração: `adminLab.communityReports`, `actionCommunityReport`, `dismissCommunityReport`, `communityPublicationAudit` e `setCommunityPublicationHidden` exigem papel administrativo e flag do laboratório. Descarte e ação registram responsável e data. Ação checa a revisão exata sob transação e bloqueio por autor, oculta persistentemente, cria auditoria somente se houve nova ocultação e resolve a denúncia atomicamente; decisões repetidas são idempotentes.
- `publishAchievement` torna a revisão temporal estritamente crescente, mesmo em revogações/republicações no mesmo milissegundo, para impedir que uma denúncia antiga alcance uma publicação posterior.
- A página `/community` (somente sob flag comercial) contém, sob painéis fechados por padrão, preferências, bloqueios próprios, histórico de denúncias e feed. Denunciar e bloquear são ações explícitas. O painel `/admin` fica sob flag administrativa e papel `admin`.

## Verificações automatizadas

- `tests/commercial-mysql-lab.ts`: MySQL descartável, assinaturas, privacidade, bloqueios, suspensão, expiração, feed antes da paginação, duplicidade concorrente de denúncias, autorização de membros/admins, resolução concorrente e auditoria, idempotência, revisão obsoleta, república no mesmo milissegundo e histórico privado após expiração.
- `server/admin-router-access.test.ts`: conta não administrativa ou não autenticada sem acesso a consultas e mutações de moderação; entradas inválidas rejeitadas.
- `server/community-rate-limit.test.ts`: orçamento padrão de oito tentativas e orçamentos explicitamente limitados para paginação/administração.
- `tests/browser/run-academy-qa.mjs`: Chromium sintético com integrante denunciando conquista e bloqueando autor, histórico após expiração sem buscar feed e administrador ocultando/descartando separadamente, inclusive na largura de 375 px.
- Workflows: P0, Partner MySQL laboratory, Isolated Chromium QA, Public live browser laboratory. Em 28/11, os quatro estavam aprovados para o commit `65f3d9e`; não extrapolar essa evidência a commits posteriores sem verificar novamente.

## Bloqueios antes de liberar

1. Aprovar a migração de tabelas experimentais (todas fora do journal de produção) e executar preflight e reversão em ambiente isolado. Nunca aplicar automaticamente em produção.
2. Definir política jurídica e técnica de retenção, exclusão de contas/denúncias, exportação dos registros e preservação de trilha de segurança. As referências atuais a `users` em tabelas de auditoria e denúncia podem interferir na exclusão de contas.
3. Substituir a limitação local `rateLimit` por proteção distribuída antes de abrir tráfego real, preservando limitação estrita para criação de denúncias.
4. Homologar visualmente o feed e a fila administrativa em desktop/mobile com dados sintéticos; rever acessibilidade, paginação, denúncias repetidas e publicação restaurada.
5. Confirmar que ambas as flags do servidor e ambas as flags do cliente seguem desabilitadas em produção até decisão específica. Não liberar feed público nem reutilizar essa evidência para certificar proficiência.
6. Planejar identificadores públicos/nome social e controles de identidade antes de expor o feed para clientes reais; o laboratório usa ID numérico interno.

CSLE segue separado, sem alteração na autoridade curricular/certificadora e sem consentimento implícito para dados pedagógicos.
