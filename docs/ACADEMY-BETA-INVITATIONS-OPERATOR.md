# Academy Beta — operação local de convites (sem produção)

Documento operacional para **primeiros alunos convidados**, em caráter restrito. Nenhum arquivo de convite, token ou e-mail real deve entrar no GitHub, no CI, em issues, screenshots ou logs. O CSLE não participa desta autorização; trata-se exclusivamente de admissão à Academy.

## Premissas e limites

- O backend aceita no máximo **20 convites** simultaneamente em `ACADEMY_INVITATIONS_JSON`, e cada registro contém apenas `email`, `tokenHash` (SHA-256) e `expiresAt` (UTC). Os tokens brutos nunca aparecem no arquivo.
- Modo de piloto: `ACADEMY_ADMISSION_MODE=invite` e, somente após os gates comerciais e de abuse/budget aprovados, `ACADEMY_TRIAL_ENABLED=true`. Não usar `open` em piloto fechado.
- Convite: token criptograficamente aleatório de 32 bytes (43 caracteres em base64url), vinculado ao e-mail exato normalizado; validade de 1 a 30 dias a partir da emissão. O prazo **do convite** não é a duração do teste gratuito nem um cupom de promoção.
- Permite acesso a **cadastrar conta** até a expiração. Depois disso, o aluno que já tiver conta pode continuar fazendo login; a assinatura/trial e o acesso ao currículo têm gates separados.
- Até que haja um sistema administrativo seguro para convites, o operador é um **CLI local**, deliberadamente não montado como endpoint HTTP ou painel de clientes.

## Comandos locais

Crie manualmente uma pasta privada **fora do checkout** (ex.: `$HOME/.config/lingua-pilot`), com permissão `0700`; use um caminho absoluto. Com dependências do repositório instaladas, execute:

```sh
pnpm exec tsx scripts/academy-beta-invites.ts issue /CAMINHO/PRIVADO/invitations.json aluno@exemplo.com 7
pnpm exec tsx scripts/academy-beta-invites.ts audit /CAMINHO/PRIVADO/invitations.json
pnpm exec tsx scripts/academy-beta-invites.ts revoke /CAMINHO/PRIVADO/invitations.json aluno@exemplo.com
```

O comando `issue` imprime uma única vez `INVITE_CODE=...`, que deve ser entregue **separadamente e de forma segura** ao destinatário vinculado ao e-mail. Não copiar o token para screenshots, mensagens públicas ou documentação de código. O operador cria ou substitui o arquivo usando gravação temporária e renomeação atômica, com modo `0600`. Recusa arquivo com permissões amplas, symlink e destino dentro do repositório.

Após qualquer emissão ou revogação, a equipe deve atualizar, de forma segura e conforme o procedimento do ambiente de **staging**, `ACADEMY_INVITATIONS_JSON` com o JSON gerado e reiniciar ou recarregar a configuração da aplicação, conforme o mecanismo aprovado. **O CLI não acessa o servidor, não altera Render, não usa banco e não ativa flags de produção.** Revogar no arquivo local sem atualizar o ambiente de destino **não** revoga imediatamente o convite no servidor.

O comando `audit` apresenta apenas totais (`total`, `active`, `expired`, `availableSlots`), sem tokens ou e-mails. Para reemitir uma credencial a um e-mail já convidado, revogue o registro anterior primeiro. Um convite vencido continua ocupando uma das 20 posições até ser revogado manualmente.

## Homologação obrigatória antes de convidar pessoas

1. Usar e-mails e tokens sintéticos em MySQL descartável e no laboratório HTTP, em modo `invite`; confirmar convite ausente, errado, expirado e de outro e-mail negados antes de qualquer escrita.
2. Concorrência: duas tentativas de cadastro com mesmo convite deixam somente uma conta, uma credencial e sessão válida; conferir status HTTP e que senha/hash não vazam.
3. Login permanece disponível após fechar inscrições. O fim do trial impede tutor/curso, não impede sessão, privacidade, histórico, exportação ou exclusão autorizada.
4. Revisar **screenshot** e experiência do visitante (landing/login), convite, onboarding e passagem ao Campus em 320, 375, 768, 1024, 1440 e 1672 px com Chromium isolado.
5. Validar os quatro workflows da PR e o estado da integração comercial. Nenhum pagamento ou conversão é presumido por um convite.
6. Obter aprovação de rollout/staging, limites compartilhados de taxa, política de privacidade e acesso antes de usar e-mails de alunos reais.

Referências: `server/academy-beta-invite-ops.ts`, `scripts/academy-beta-invites.ts`, `server/academy-beta-invite-ops.test.ts`, `server/academy-beta-invite-cli.test.ts` e `tests/academy-mysql-http-lab.ts`.
