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

## QA e operação da primeira coorte — 25/11/2026
A suíte `server/academy-admission-http.test.ts` monta o **appRouter original**, Express, o adaptador HTTP tRPC, verificação de origem, limitador local e JWT reais em loopback. Registro/login e diretório de contas são sintéticos; acesso ao DB é proibido no fixture. Cobre oito cenários: modo público mínimo, ausência/código trocado/e-mail incompatível, expiração/revogação/config inválida, origem, duas sessões distintas e duplicidade simulada, login após fechamento, limite por IP e modo legado. Não valida transação MySQL, senha real, cookie em navegador HTTPS ou concorrência persistente.

O Chromium em `tests/browser/run-academy-qa.mjs` executa o bundle real, com respostas tRPC públicas sintéticas e tráfego externo bloqueado. Oito casos: 320/375/768/1440 px, convite obrigatório e limpeza ao trocar modo, fechado, aberto e foco/navegação demo. Não é comparação visual pixel a pixel, teste de cadastro real ou teste pedagógico. CI da versão final deve ser conferido pelo SHA, não presumido.

### Checklist operacional antes de emitir convites reais
1. Confirmar staging isolado, backup restaurável, schema necessário e mecanismo de rollback. Não aplicar migrations por este checklist.
2. Configurar explicitamente `ACADEMY_ADMISSION_MODE=closed` no ambiente destinado ao piloto; variável ausente abre cadastro legado. Conferir após restart e garantir que o login das contas existentes funciona. Sem convite real nesta fase.
3. Definir coorte inicial pequena, até 20 convidados cadastráveis, e manter registro privado de admissões, revogações, responsáveis e validade. Entregar código somente em canal privado; jamais incluir dados reais no repositório ou URLs.
4. Conferir que a allowlist do tutor `LINGUA_TUTOR_ALLOWED_EMAILS` e a configuração de admissão são coordenadas; nenhuma delas substitui a outra. Usar apenas provedor autorizado, sem Stripe. O limite atual do tutor é por processo: 100 operações/dia UTC no total, 30 por aluno, 2 concorrentes no total e 1 por aluno; tentativas falhas contam. Reinício/múltiplas instâncias não preservam esse teto. Não prometer limite financeiro durável.
5. Homologar cadastro real e duplicidade/concorrência em MySQL descartável antes de staging real; testar duas contas independentes, logout, sessão, onboarding, diagnóstico, consentimento, tutor/áudio, prática, SRS e recuperação após falhas. Nenhuma conta real de aluno ou chamada externa nos testes automatizados acima.
6. Validar mobile físico, teclado, zoom, assets, comparação com a referência aprovada e canal de suporte/registro de incidentes. Abrir em modo invite somente após aprovação dos gates. Em incidente de admissão, fechar novas inscrições e avaliar sessões/contas existentes separadamente; fechar inscrições não as revoga.
7. Não coletar dados para treinamento nem publicar resultados de aprendizagem sem consentimento e evidência. Sem cobrança, sem ativação produtiva e sem expansão comercial nesta etapa.

O controle de custos, o cadastro em MySQL descartável e a homologação humana seguem como gates, não itens concluídos.
