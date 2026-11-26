# Academy Beta — admissão controlada

## Modos de cadastro (servidor)
- ACADEMY_ADMISSION_MODE=closed: nenhum novo cadastro, sem alterar login existente.
- ACADEMY_ADMISSION_MODE=invite: somente e-mail associado a código de 32 bytes aleatórios (43 caracteres base64url) válido até a data ISO UTC.
- ACADEMY_ADMISSION_MODE=open ou variável ausente: comportamento legado. **Não usar na Academy Beta.** Valor desconhecido fecha cadastro.

Configurar inicialmente closed em staging dedicado; conferir comportamento, depois ativar invite somente após os gates de homologação. Nenhum ambiente foi configurado nesta PR.

ACADEMY_INVITATIONS_JSON: array de até 20 objetos {email, tokenHash, expiresAt}. tokenHash é SHA-256 hexadecimal minúsculo do código. Configuração inválida, duplicada ou ausente nega acesso no modo invite. Não incluir e-mails reais ou códigos no GitHub, logs ou URLs. Guardar no ambiente protegido do serviço. Gerar individualmente via Node local:
```js
const { randomBytes, createHash } = require("node:crypto");
const code = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(code).digest("hex");
// Entregar code privadamente ao destinatário; salvar apenas tokenHash na configuração.
```
O operador precisa registrar a validade de cada convite e confirmar o endereço de entrega. Não existe verificação independente de posse do e-mail além da entrega segura do código. A unicidade de localCredentials.email impede novo cadastro duplicado do mesmo e-mail; o convite não possui ledger de consumo. Remover registro ou fechar cadastro para revogar convites ainda não usados; alterações de ambiente dependem da atualização do serviço. Não revoga contas ou sessões já emitidas. Não há gestão de suspensão de aluno neste bloco.

## Limites e testes obrigatórios
- Limite de 20 registros por configuração, não limite vitalício de contas; acompanhar número de admissões manualmente, nunca rotacionar listas sem controle de coorte.
- Limites de tentativa existentes por IP/e-mail, e novo limite por IP no modo não aberto, são locais ao processo. Não equivalem a rate limit distribuído.
- Testes unitários da política não substituem testes HTTP com banco de teste: cadastro sem código, código trocado, vencido/revogado, conta duplicada, login existente, dois alunos isolados e concorrência.
- Confirmar orçamento e limites do tutor/voz, suporte, consentimento, restauração e rollback. Nenhuma cobrança e nenhum acesso aberto antes de homologação.
- Não publicar configuração de produção, alterar banco ou ativar recursos pagos por esta documentação.
