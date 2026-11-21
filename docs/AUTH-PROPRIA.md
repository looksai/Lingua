# Lingua — Auth própria, revisão de segurança (PR sem merge)

## Escopo
- **Sem deploy e sem migrations na Aiven** neste PR.
- Reutiliza a tabela `users` e `users.id` (identidade de ownership de learning/SRS); cria `localCredentials` via migration manual `0003`.
- Login e cadastro próprios; cookies `HttpOnly; Secure; SameSite=Lax`, JWT HS256 com `issuer`, `audience`, `iat`, `exp` de 12 horas; `SESSION_SECRET` com mínimo 32 bytes.
- Sessões Manus e tokens Bearer legados **não são aceitos**. Rotas `learning`, `speech` e `system.notifyOwner` exigem usuário autenticado. `auth.me` e `system.health` continuam públicas.
- Mutations tRPC exigem `Origin` correspondente ao `Host` e HTTPS em produção.
- Senhas: **scrypt-v1** (N=32768, r=8, p=1), salt aleatório 128 bits, comparação timing-safe. **APROVADO PELO AUDITOR DEEP:** scrypt nativo Node como exceção à preferência inicial bcrypt/argon2.
- Limitador de tentativas é por processo, insuficiente para múltiplas instâncias ou ataques distribuídos. Requer solução compartilhada e recuperação de conta antes de abrir cadastro público.
- O logout limpa cookie, mas JWT emitido permanece válido até expiração se copiado antes do logout; não há lista de revogação. Sessões expiram em 12h. Avaliar revogação persistente para produção.
- Cadastro não confirma propriedade de email. **Não abrir ao público** sem verificação de email, política de abuso e recuperação de senha.

## Sequência segura após auditoria
1. Revisar PR e testes; nenhuma alteração da `main` sem aprovação expressa do fundador.
2. Aplicar somente a migration `0003_local_credentials.sql` na Aiven por execução manual auditada; não reutilizar o workflow `migrate` de 0000-0002.
3. Configurar `SESSION_SECRET` com valor aleatório gerado pelo painel/gerenciador de segredos do Render; não colocar em GitHub ou conversa.
4. Configurar `DATABASE_URL` e `DATABASE_SSL_CA_BASE64` no Render. Remover `MANUS_*` do serviço após mudança de código, quando apropriado.
5. Deploy e testes de fumaça: anônimo 401 para learning, sessão legada rejeitada, cadastro/login, isolamento entre usuários, logout, cookies, CSRF, rate limit e TLS.
6. Manter `main` e deploy atual inalterados durante revisão.
