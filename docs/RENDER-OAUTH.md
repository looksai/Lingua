# Guia rápido — Lingua no Render (OAuth Manus e MySQL externo)

**Objetivo:** preparar o **My Workspace** já confirmado para hospedar somente o servidor Web **Free**, sem criar nenhum serviço, sem contratar plano e sem iniciar deploy. A conta Render já possui o serviço *nordstar-business-os-temporary*, também Free: **não tocá-lo nem reaproveitá-lo**. O Lingua ainda não tem Web Service no Render.

## Antes de tudo: escolha o tipo de login

O projeto possui **autenticação Manus WebDev (legada)**. Ela não é a mesma coisa que um **Manus Open App OAuth**.

| Caminho | É compatível agora? | O que fazer |
|---|---|---|
| **A — Manus WebDev existente** | **Somente se** o projeto original aceitar callback HTTPS externo | Verificar o projeto Manus original e a permissão para `/api/oauth/callback` no domínio Render |
| **B — Manus Open App OAuth** | **Não**, exige um adaptador de autenticação separado, ainda não implementado | Criar App **apenas se tiver conta Manus Team** e houver aprovação de uma migração; não usar os segredos Open App diretamente na implementação WebDev |

**Atenção:** a documentação oficial [Manus — Open App](https://open.manus.ai/docs/v2/open-app) diz que a criação e a autorização de Open Apps exigem uma **conta Team**; uma conta pessoal não pode criar nem autorizar esse tipo de aplicativo. Open App serve para conceder acesso à API Manus em nome do usuário; não se deve presumir que sua autenticação é intercambiável com o login WebDev.

### Caminho A — verificar WebDev sem alterar o código

1. Abra o [Manus](https://manus.im/) e localize o **projeto original que gerou o Lingua**.
2. No projeto, procure as configurações de domínio/autenticação e, especificamente, suporte a **redirecionamento OAuth externo HTTPS**. A localização exata dessa opção na interface WebDev ainda **não foi confirmada**; não confundir com as configurações **Open App**.
3. Confirme com a documentação do seu projeto ou suporte Manus se o destino `https://<servico>.onrender.com/api/oauth/callback` pode ser autorizado.
4. Somente se a resposta for positiva, reúna legitimamente **`MANUS_PROJECT_ID`, `MANUS_OAUTH_PORTAL_URL` e `MANUS_OAUTH_API_URL`** para homologação, e gere um **`MANUS_JWT_SECRET` exclusivo**, guardado apenas no painel de secrets do Render.
5. **Se não houver callback externo, pare.** Não altere o login nem publique o serviço sem um plano aprovado de substituição de identidade e testes de usuários/cookies/CSRF.

### Caminho B — criar Open App, somente se decidirmos substituir a autenticação

1. Leia [a documentação oficial de Open Apps do Manus](https://open.manus.ai/docs/v2/open-app) e verifique se sua conta é **Team** e se a aplicação terá as permissões necessárias. **Se não for Team, não contrate um plano por conta desta orientação.**
2. Na sua conta Team, acesse as **configurações de Desenvolvedor (Developers)** indicadas na documentação e escolha criar uma **Open App**.
3. Defina nome, descrição, URL inicial e um **redirect URI HTTPS exato** que o **futuro adaptador** usará; não suponha que o callback WebDev existente aceita a resposta Open App. Não utilize wildcard.
4. Após criar a Open App, o Manus apresenta um **`client_id`** e um **`client_secret` inicial**, exibido uma única vez. Guarde-os em gerenciador seguro e no Render somente quando o adaptador estiver aprovado. Nunca cole segredos em chats ou no Git.
5. **Pare antes do deploy:** o Lingua atual usa `/app-auth` e `WebDevAuthPublicService/ExchangeToken`; a Open App usa `https://manus.im/openapi/oauth` e `https://api.manus.ai/oauth/token`. Precisamos desenvolver e testar um adaptador OAuth2 separado (state, PKCE quando aplicável, sessão, autorização e associação de identidade) antes de usar essas credenciais.

## Configurar variáveis no Render (somente após escolher o caminho)

No [Render Dashboard](https://dashboard.render.com/), entre em **My Workspace** e escolha futuramente **New → Blueprint** conectado à **branch `fix/p1-concorrencia-abas`** do repositório privado `looksai/Lingua`. O arquivo `render.yaml` já define **um único Web Service Node.js, plano Free, sem banco Render e com auto-deploy desligado**.

| Variável `sync: false` | Estado no código atual |
|---|---|
| `DATABASE_URL` | **Ativa**, MySQL externo *somente* homologação, com TLS autenticado a validar |
| `MANUS_PROJECT_ID` | **Ativa**, WebDev |
| `MANUS_OAUTH_PORTAL_URL` | **Ativa**, WebDev |
| `MANUS_OAUTH_API_URL` | **Ativa**, WebDev |
| `MANUS_JWT_SECRET` | **Ativa**, segredo de sessão do Lingua |
| `OAUTH_CLIENT_ID` | **Reservada/inativa** até implementação de Open App |
| `OAUTH_CLIENT_SECRET` | **Reservada/inativa** até implementação de Open App |
| `SESSION_SECRET` | **Reservada/inativa**; **não substitui `MANUS_JWT_SECRET`** no código atual |

**Importante:** ao criar um Blueprint, o Render solicitará os valores `sync: false`; não inventar nem preencher placeholders como se fossem credenciais válidas. Se o painel exigir variáveis reservadas antes de permitir criar o recurso, **não aplicar o Blueprint**: revisar o arquivo após decidir o provedor de login. Render documenta que `sync: false` pede os valores na criação inicial, enquanto os valores em atualização posterior precisam ser definidos manualmente no serviço: https://render.com/docs/blueprint-spec .

## Banco MySQL externo (não criar dentro do Render)

1. Escolher fornecedor de **MySQL 8 de staging**, aprovando antecipadamente qualquer custo. O MySQL do GitHub Actions é descartável e não substitui banco persistente.
2. Criar credenciais com permissões mínimas e **sem dados reais**. Não colocar a URI no YAML.
3. Antes da conexão, revisar a configuração de TLS do driver `mysql2`: **a implementação atual ainda precisa de validação de TLS/certificados**; `mysql://` por si só não prova segurança.
4. Aplicar migrations 0000, 0001 e 0002 num banco de homologação novo por procedimento auditado, nunca em produção sem plano separado.
5. Só então fornecer `DATABASE_URL` na configuração privada do Render.

**Capturas de tela:** não foram incluídas porque não há uma captura verificada da interface atual das configurações Manus WebDev/Developers. Links oficiais são usados em vez de imagens inventadas ou potencialmente desatualizadas.

**Ponto de parada:** não criar Blueprint, publicar URL, migrar banco nem ativar login antes de o fundador confirmar banco, callbacks Manus e configuração segura de credenciais. O PR #3 ainda não deve sofrer merge sem autorização expressa do fundador.

---

## Anexo técnico — detalhes do código e do ambiente

**Situação:** preparado, **não publicado**. Nenhuma conta Render, banco de homologação, credencial ou URL funcional foi criada por este commit. Somente dados sintéticos. O preview do Render será uma URL HTTPS na nuvem; não precisa instalar Docker nem executar `pnpm dev` no notebook.

## Primeiro: a diferença entre os dois OAuth do Manus

O Lingua atual **não implementa o protocolo OAuth genérico de uma Open App da API Manus**. O código existente usa **Manus WebDevAuthPublicService**, com `/app-auth` e as variáveis `MANUS_*`. Conferência direta:

- `client/src/const.ts`: monta a URL `{MANUS_OAUTH_PORTAL_URL}/app-auth` com `appId=MANUS_PROJECT_ID`, `redirectUri=https://SEU-RENDER.onrender.com/api/oauth/callback` e `state` com nonce.
- `server/_core/oauth.ts`: valida o cookie do nonce, troca `code` por token no servidor, obtém `openId`, grava usuário e cria cookie de sessão.
- `server/_core/sdk.ts`: usa `MANUS_OAUTH_API_URL`, `MANUS_PROJECT_ID` e `MANUS_JWT_SECRET`.
- `server/_core/publicConfig.ts`: expõe apenas `MANUS_OAUTH_PORTAL_URL` e `MANUS_PROJECT_ID` e outros campos explicitamente públicos; **segredos nunca devem chegar ao navegador**.

**Importante:** `OAUTH_CLIENT_ID` e `OAUTH_CLIENT_SECRET` **não são lidos pelo Lingua atual**; adicioná-los ao Render não habilita login. A documentação oficial [Manus Open App](https://open.manus.ai/docs/v2/open-app) descreve uma **outra** integração OAuth/API, não uma substituição automática de WebDev Auth. O painel desse produto pode exigir elegibilidade própria. Não criar um cliente genérico esperando que funcione com o Lingua.

### Checklist para verificar o Manus WebDev (antes de criar Render)

1. Entre no [Manus](https://manus.im/) usando a conta proprietária do **projeto Lingua original**; não entre em um projeto de terceiros.
2. Abra a configuração do projeto WebDev que originou o código. Procure a seção de **domínios, autenticação ou redirecionamentos OAuth**. O nome exato do menu pode variar e **não foi confirmado**.
3. Verifique se esse projeto aceita um **callback HTTPS externo** do tipo `https://SEU-SERVICO.onrender.com/api/oauth/callback` e se permite autorizar esse domínio. Se não encontrar a opção, peça confirmação ao suporte do Manus; não suponha que o portal permita callback fora da plataforma.
4. Confira se você consegue obter, de forma legítima e sem colar segredos aqui, os valores de staging `MANUS_PROJECT_ID`, `MANUS_OAUTH_PORTAL_URL` e `MANUS_OAUTH_API_URL`. Não copie valores de um ambiente de outra pessoa.
5. **Se callbacks externos não forem suportados, pare neste ponto.** Precisaremos aprovar um novo provedor de identidade e uma migração de autenticação (com equivalência do `openId`, testes de sessão, CSRF, cookies, autorização e isolamento), em PR próprio. **Nenhuma substituição foi implementada.**

## Banco MySQL de homologação — escolher antes de publicar

O MySQL do GitHub Actions existe **somente durante o job** e não pode servir como banco permanente do Render.

- **Aiven MySQL Free: apenas solução temporária**. Em anúncio oficial de novembro de 2026, Aiven confirmou encerramento do MySQL Free em **21/12/2026**, quando serviços remanescentes serão desligados e dados/backups apagados. **Não usar como base duradoura**. Se for usado para QA estritamente descartável, excluir dados e migrar/encerrar antes dessa data.
- **Aiven MySQL Developer:** plano **pago**; só criar se o fundador aprovar o custo exibido no checkout/painel. Preços variam e não devem ser assumidos. Documentação: https://aiven.io/docs/products/mysql/howto/mysql-free-tier-migration-options .
- **Outros MySQL externos:** somente após comprovar compatibilidade com MySQL 8, índice único `(userId,operationId)`, transações `FOR UPDATE`, driver `mysql2` e migrações 0000/0001/0002. Não presumir equivalência de bancos compatíveis com protocolo MySQL.

### Segurança do banco

1. Use **projeto, banco e usuário separados de produção**, com permissões mínimas, e **dados sintéticos**, sem alunos reais.
2. Prefira TLS com verificação do certificado da autoridade. O backend atualmente chama `drizzle(process.env.DATABASE_URL)` em `server/db.ts`. **A configuração explícita de TLS para o provedor externo ainda precisa ser implementada/testada no driver**, sem `rejectUnauthorized:false`. Uma URL `mysql://...` por si só não comprova TLS verificado.
3. Antes de ligar o Render ao banco externo, executar em homologação um job de migração aprovado que aplique `0000_initial_users.sql`, `0001_great_maggott.sql` e `0002_p0_review_idempotency.sql`, apenas **uma vez**, em ordem, e valide schema e concorrência. O job descartável do GitHub **não criou esse banco externo**.
4. Nunca colocar `DATABASE_URL`, senha, certificados ou chaves em Git, PRs, prints, chat ou variáveis públicas do frontend.

## Quando o banco e o OAuth forem aprovados: passo a passo Render (sem terminal no Celeron)

1. Entre em [Render](https://dashboard.render.com/) e crie uma conta. Confira os limites de preço/uso e selecione explicitamente o plano **Free**.
2. Na integração GitHub do Render, autorize **somente** o repositório privado `looksai/Lingua` com o mínimo de permissões possível.
3. Escolha **New → Blueprint** no painel Render. Selecione o repositório e confirme que o Blueprint lê o `render.yaml` da **branch `fix/p1-concorrencia-abas`**, não a `main`. Revise o nome `lingua-p1-staging`, plano Free e **autoDeployTrigger: off**. O processo inicial de criação **pode disparar o primeiro deploy**, ainda que o auto-deploy esteja desligado; só confirme quando todos os gates estiverem satisfeitos.
4. O Render solicitará os valores `sync: false`. Use o painel seguro, **não cole nenhum valor na conversa**. Insira as variáveis indicadas na tabela abaixo. Se alguma credencial não estiver legitimamente disponível, **não habilite o serviço como preview autenticado**.
5. Verifique que `NODE_ENV=production` e `NODE_VERSION=24.22.3`. O Blueprint já define esses valores. `PORT` é fornecida pelo próprio Render.
6. Confirme a configuração de autenticação de domínio/callback no Manus e do banco MySQL com TLS; somente depois autorize o primeiro deploy.
7. Após disponibilizar a URL `https://SEU-SERVICO.onrender.com`, abra `/api/health` para ver HTTP 200. **Essa rota não verifica OAuth nem banco!** Faça um smoke test de login/logout usando contas sintéticas autorizadas e verifique o callback, o cookie seguro e a leitura do usuário correto.
8. Para QA P1: abra duas abas e dois usuários de teste, simule queda de rede e fila pendente, volte online, confira apenas um replay por usuário, ausência de falsos ACKs e isolamento entre contas. Sem dados pessoais reais.

| Variável no Render | Obrigatória para quê? | Origem / cuidados |
|---|---|---|
| `DATABASE_URL` | Operações persistentes | URI do MySQL de homologação com TLS verificado pelo driver |
| `MANUS_PROJECT_ID` | Identidade do projeto WebDev | ID do projeto autorizado, **não** credencial OAuth genérica |
| `MANUS_OAUTH_PORTAL_URL` | Iniciar login no navegador | URL oficial do portal WebDev associada ao projeto |
| `MANUS_OAUTH_API_URL` | Troca de código/consulta de usuário no servidor | URL HTTPS legítima do serviço WebDev Auth |
| `MANUS_JWT_SECRET` | Assinatura de sessão no servidor | Segredo aleatório de staging, diferente de produção, gerado com fonte criptográfica segura |
| `NODE_ENV` / `NODE_VERSION` | Build/runtime | Fixos no Blueprint, não são segredos |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | **Não utilizados no código atual** | Não inserir até um adaptador para novo provedor ser aprovado e implementado |

**Atenção:** a URL `*.onrender.com` de um Web Service Free é pública. Não existe privacidade por ser um repositório Git privado. É preciso limitar o acesso aos endpoints, não remover a autenticação para facilitar QA. A disponibilidade Free não é garantida: o serviço pode entrar em suspensão após 15 minutos sem tráfego. Não há garantia de custos zero para banco, chamadas de IA ou serviços do Manus.

## Critérios de autorização

- [ ] Deep e fundador aprovam o PR P1 (concorrência entre abas); o merge é uma ação distinta.
- [ ] Revisão independente confirma a possibilidade de callback Manus externo **ou** aprova um novo plano de autenticação.
- [ ] Banco externo exclusivamente de staging provisionado e testado com TLS verdadeiro e migrations revisadas.
- [ ] Nenhuma credencial vazou para código, logs ou cliente.
- [ ] Fundador autoriza explicitamente criação de infraestrutura, configuração de domínio, eventual despesa e exposição de URL.
- [ ] Smoke test e QA multiaba executados em navegador real antes de qualquer aceitação de produção.

Referências oficiais:
- https://render.com/docs/blueprint-spec
- https://render.com/docs/infrastructure-as-code
- https://render.com/docs/free
- https://render.com/docs/configure-environment-variables
- https://open.manus.ai/docs/v2/open-app
- https://aiven.io/changelog/507f8b1b-dd8f-4841-ac4a-940ac492b688
- https://aiven.io/docs/products/mysql/howto/mysql-free-tier-migration-options

## Complemento P1 — CA MySQL no Render

A branch `fix/p1-aiven-tls` acrescenta `DATABASE_SSL_CA_BASE64` (valor secreto em Base64 do conteúdo do `ca.pem`) e conexão `mysql2` com CA e `rejectUnauthorized: true`. Leia [P1-AIVEN-TLS.md](P1-AIVEN-TLS.md) antes de configurar o banco remoto; não execute migrations através do `drizzle-kit` sem a configuração segura específica dessa ferramenta.
