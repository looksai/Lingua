# Lingua Fase 01 — Continuidade local do ASSUNTO, sem aprendizagem persistida

**Data:** 24/11/2026. **Status:** implementação de UX para reiniciar um assunto escolhido. Não é `learnerEvidence`, SRS, CEFR, memória do CSLE, histórico de tentativas nem prova de retenção.

## Por que este recurso existe
O controlador CAL do Naruto funciona em memória com TTL de 30 minutos. Um reinício do Render destrói a sessão, os tickets, observações e demais dados provisórios; isso é **intencionalmente conservador**, mas é frustrante para o aluno perder até o assunto que escolheu.

Nesta etapa a solução **não restaura o estado CAL**. Com escolha expressa, o navegador pode lembrar só o ID de uma microcompetência e apresentar a opção de **recomeçar o assunto do zero**.

## Contrato de armazenamento
- Separado do opt-in existente de mensagens do chat. A preferência `lingua:study-topic-choice:v1:<conta+provedor>` é `false` por padrão.
- O único registro opcional é `{version:1,competencyId,savedAt}`, escrito no `localStorage` deste navegador, por até **7 dias**. O ID precisa existir na allowlist do catálogo original.
- **Nunca** guarda resposta, áudio, transcrição, resultado, observações, tickets, sessão CAL, profissão, nota, proficiência, certificado ou dado de terceiro.
- Cada combinação de conta/provedor possui seu próprio par de chaves. Texto simples apenas; dispositivo compartilhado deve evitar opt-in.
- Desativar apaga a preferência e o registro. Apagar conversa local apaga o registro sem forçar novo aceite, mantendo o opt-in independente. Armazenamento indisponível gera falha explícita, sem enviar marcador ao servidor.
- O marcador não sincroniza aparelhos. Não é autorização para reutilização de dados, treinamento de IA ou comercialização.

## Reinício da sessão
- Ao clicar em `Recomeçar assunto salvo`, a interface valida novamente o ID do catálogo e chama `tutor.reply` usando `catalogCompetencyId` **e** `catalogRestart:true`.
- O servidor só aceita `catalogRestart:true` com um ID de competência explícito; executa a seleção numa **nova sessão CAL**. Não carrega tentativas anteriores e não alega domínio.
- Nenhuma `inputModality:"typed"` é fornecida para esse clique de interface. A fronteira existente usa tratamento conservador de origem não comprovada, impedindo fingir resposta digitada.
- O restante da conversa IA mantém os mesmos gates: login autenticado, flags CAL, allowlist, autorização do provedor, orçamento, política de tutor e receipt de renderização antes de avaliar uma resposta fechada.

## Casos automatizados
- Sem opt-in não grava; opt-in separado e por conta/provedor.
- TTL 7 dias, versão inválida, timestamp futuro, JSON malformado e ID desconhecido removidos/rejeitados.
- Desativar apaga tudo; apagar o chat apaga o assunto; armazenamento bloqueado não lança exceção.
- Um clique reinicia a mesma competência com uma nova `sessionId`, observações vazias e erros zerados; ticket antigo rejeitado. Reinício sem `catalogCompetencyId` recebe BAD_REQUEST.

## Limites e próximos passos
- **Não existe persistência pedagógica entre processos ou dispositivos**. A recuperação atual no servidor também é volátil; o marcador apenas permite **recomeçar** o objetivo.
- Para persistência genuína de aprendizado, primeiro aprovar modelo de dados e retenção por finalidade, política de consentimento revogável, isolamento por conta, deleção, migração e rollback, autenticação de origem ASR e rubricas de evidência. **Nenhuma migration** foi executada nesta PR.
- Testes reais de UX com contas A/B, limpar armazenamento, provedor trocado, aba privada, reload, celular e queda do Render continuam PENDENTES. O CI não comprova browser interativo.
