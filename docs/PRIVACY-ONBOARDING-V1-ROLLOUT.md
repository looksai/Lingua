# Lingua — Cadastro único e preferência de memória (rascunho de implementação)

## Objetivo
Uma experiência simples: uso normal do tutor não exige novo aceite a cada conversa. A personalização por memórias pessoais é **opcional**, escolhida no cadastro e alterável pelo titular. Não se presume autorização para treino de modelos.

## Estado desta PR
- Novo cadastro apresenta confirmação do processamento necessário ao tutor e uma escolha separada, **desmarcada por padrão**, para lembranças pessoais.
- Endpoint `auth.signUp` exige confirmação do serviço. Preferência opcional é transmitida como boolean.
- `registerLocalUser` cria usuário, credencial e preferências versionadas na mesma transação.
- Tabela `learnerPrivacyPreferences` e SQL `drizzle/0008_privacy_preferences_DRAFT.sql` são **proposta não aplicada**.
- Testes validam que o cadastro rejeita a ausência de aceite.
- O TutorChat agora consulta preferências autenticadas, dispensa novo aceite do provedor em contas com aceite persistido e permite alterar a memória nas configurações. A memorização automática verifica a preferência com lock na mesma transação da gravação, depois da resposta da IA. Contas legadas permanecem com o fluxo antigo até transição explícita.

## Bloqueios antes de merge/deploy
1. Publicar texto completo e revisado dos termos e aviso de privacidade, com versão identificável; o checkbox atual é informativo e não substitui esses documentos.
2. Revisar SQL, backups, drift e transações em Aiven *staging*, confirmar deploy em sequência segura (migração antes de código). Não executar migration automaticamente.
3. Validar em MySQL de staging a leitura por `ctx.user.id`, a alteração autenticada de preferência, a transação com `FOR UPDATE` e o bloqueio de gravação após desativação, inclusive requisições em voo.
4. Testar o `TutorChat` com a nova preferência persistida. LocalStorage não é registro de aceite para novas contas; a modalidade legada permanece como fallback, sem autorização presumida.
5. Contas existentes não possuem linha: definir tela de transição, **não** presumir consentimento.
6. Testar isolamento A/B, logout/login, vários dispositivos, mudança de preferência durante gravação, falhas SQL e exclusão; manter uso do tutor disponível quando memória opcional falha. Cobrir os fluxos de memória em Chromium para contas novas e antigas.
7. Validar a base legal de cada finalidade com revisão jurídica. Não condicionar uso de serviço a um consentimento opcional sem necessidade.

Nenhum destes passos autoriza deploy para produção ou uso de dados de alunos reais.

## Revisão adicional de segurança (24/11/2026)
- Na conta nova com memória desativada, o tutor não cria proposta de memória nem mostra nova pergunta de autorização.
- Na conta nova com memória ativada, a resposta de IA só grava fato elegível depois de reconferir a preferência sob lock transacional.
- O endpoint legado `memorySave` também verifica sob lock: uma preferência de conta explicitamente desligada não pode ser contornada enviando `consent:true` manualmente. Para contas antigas sem linha continua valendo confirmação individual.
- O teste Chromium do TutorChat inicialmente falhou porque a fixture não tinha o novo hook; corrigido na fixture. A alteração de frontend com aceite inicial ganhou cenário dedicado.
- **Ainda não há prova de concorrência em MySQL Aiven nem rollout aprovado.** A validação final dos commits mais recentes deve ser exigida antes de merge.
