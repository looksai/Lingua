# Lingua — Cadastro único e preferência de memória (rascunho de implementação)

## Objetivo
Uma experiência simples: uso normal do tutor não exige novo aceite a cada conversa. A personalização por memórias pessoais é **opcional**, escolhida no cadastro e alterável pelo titular. Não se presume autorização para treino de modelos.

## Estado desta PR
- Novo cadastro apresenta confirmação do processamento necessário ao tutor e uma escolha separada, **desmarcada por padrão**, para lembranças pessoais.
- Endpoint `auth.signUp` exige confirmação do serviço. Preferência opcional é transmitida como boolean.
- `registerLocalUser` cria usuário, credencial e preferências versionadas na mesma transação.
- Tabela `learnerPrivacyPreferences` e SQL `drizzle/0008_privacy_preferences_DRAFT.sql` são **proposta não aplicada**.
- Testes validam que o cadastro rejeita a ausência de aceite.
- **A UI atual do TutorChat ainda faz prompts de autorização e de cada memória.** Não remover até o backend consultar e verificar escolhas persistidas, com transição para usuários legados e tratamento de falhas.

## Bloqueios antes de merge/deploy
1. Publicar texto completo e revisado dos termos e aviso de privacidade, com versão identificável; o checkbox atual é informativo e não substitui esses documentos.
2. Revisar SQL, backups, drift e transações em Aiven *staging*, confirmar deploy em sequência segura (migração antes de código). Não executar migration automaticamente.
3. Implementar leitura de preferências por `ctx.user.id`, endpoint autenticado para alterar memória e impedir gravação após desativação, inclusive requisições em voo.
4. Adequar `TutorChat` para nunca confiar em localStorage como registro de aceite e não mostrar prompts repetidos depois da validação no servidor.
5. Contas existentes não possuem linha: definir tela de transição, **não** presumir consentimento.
6. Testar isolamento A/B, logout/login, vários dispositivos, mudança de preferência durante gravação, falhas SQL e exclusão; manter uso do tutor disponível quando memória opcional falha.
7. Validar a base legal de cada finalidade com revisão jurídica. Não condicionar uso de serviço a um consentimento opcional sem necessidade.

Nenhum destes passos autoriza deploy para produção ou uso de dados de alunos reais.
