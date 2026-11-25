# Lingua Ads V1 — anúncios próprios, sem vigilância

**Escopo implementado em draft:** empresas institucionalmente verificadas, com usuário proprietário ativo, podem enviar texto patrocinado para duas posições: portal inicial e diretório. As propostas começam pendentes; somente administrador pode aprovar. O autor pode pausar uma aprovação. Ads aprovados aparecem com rótulo **Patrocinado**, identidade da organização e link interno fixo para seu próprio perfil.

Não há CPM, CPC, orçamento, faturamento, garantias de impressões, sistema de leilão ou algoritmo de recomendação comportamental. O anúncio não acompanha chats, interesses sensíveis, memórias do aluno, SRS ou profissão do usuário. Nenhum pixel de rastreamento nem contadores de cliques são ativados.

**Restrições intencionais:** por enquanto, anúncios são exclusivamente texto (sem imagens externas, redirecionamentos ou landing pages de terceiros). O link público é construído pelo servidor a partir do slug institucional. O conteúdo deve ser revisado quanto a alegações migratórias falsas, promessas de aprovação de vistos, discriminação, publicidade oculta e credenciais regulamentadas.

**Privacidade:** uma instituição não vê identidades de visitantes, alunos ou membros só porque patrocinou um espaço. É um produto de publicidade contextual, não acesso a leads. Solicitações de atendimento permanecem no fluxo separado, voluntário, com autorização própria.

## Dependências e release gates

- **0008** da PR #75 e **0009** das PRs #77–79 devem ser revisadas/aplicadas em ambiente *staging* identificado antes da **0010**, que permanece **DRAFT**.
- `LINGUA_PORTAL_COMMUNITY_ENABLED=true` e `LINGUA_PORTAL_ADS_ENABLED=true` são exigidas para a API; segunda flag OFF por padrão.
- Política comercial, contratos, elegibilidade para anúncio, retenção, controles antifraude, revisão de conteúdos, suspensão, logs auditáveis e verificação jurídica profissional são pendências.
- Antes de vender anúncios, implementar capacidade contratual/cobrança (Stripe), limites de exposição, disponibilidade, período de campanha, métricas de agregação com cautela e governança de reembolsos.
- Os testes com MySQL descartável não comprovam desempenho, segurança em produção nem conformidade regulatória. Não ativar anúncios comerciais reais sem testes em staging.
- Estratégia de **Lingua Live**: planejar separadamente vídeo via provedor de mídia apropriado; não usar o servidor do tutor como CDN de streaming. Nenhuma transmissão foi implementada nesta PR.

**Não foi feito:** deploy, migration real, importação de imagens do kit, coleta para anúncios, cobrança ou empresas reais.
