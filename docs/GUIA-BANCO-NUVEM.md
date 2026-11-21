# Lingua — Guia de banco MySQL na nuvem (sem Docker local)

## 1. Caminho recomendado: GitHub Actions
Não precisa baixar Docker, MySQL, Node ou pnpm no notebook. Abra https://github.com/looksai/Lingua/actions e consulte **P0 MySQL migration (disposable)**. O push da branch fix/p0-auditada dispara o teste automaticamente. A opção Run workflow (workflow_dispatch) existe no YAML, mas o GitHub exige que o workflow esteja na branch padrão para habilitar a execução manual; enquanto main permanece congelada, use a execução automática da branch. Não faça merge só para habilitar o botão.

O job cria MySQL 8.0 temporário no runner, aplica os SQL 0000 e 0001, insere uma fixture legada fictícia, aplica 0002 e executa o Vitest contra o backend real. As migrations são executadas diretamente a partir dos arquivos SQL, não pelo controle de journal do Drizzle CLI. O container é removido pelo GitHub ao acabar o job, inclusive se falhar. Não usa secrets, banco externo ou dados reais. As credenciais fixas no YAML são exclusivas desse serviço efêmero, não credenciais de produção.

Abra o job mysql-integration e confira se todas as etapas passaram. Se houver erro, copie somente as linhas do erro sem segredos e encaminhe ao GPT/Deep. Não declare P0 aprovado antes da revisão independente e do teste de navegador.

## 2. Aiven: opcional para um ambiente persistente de homologação
O plano gratuito MySQL documentado pela Aiven possui 1 GB de RAM e disco, sem cartão obrigatório, sujeito à disponibilidade e condições do provedor. Não é necessário para o teste automatizado descrito acima.

1. Abra https://console.aiven.io/ e crie uma conta. Confirme o e-mail.
2. No console, crie um projeto separado para o Lingua de testes. Escolha Create service, MySQL, e o plano Free. Confira que o total é zero antes de confirmar; não adicione cartão nem escolha um plano pago. Se Free não estiver disponível, pare: use apenas o GitHub Actions.
3. Escolha região disponível e nome lingua-homologacao. Aguarde o status Running/Powered on.
4. Entre em Overview / Connection information. Anote Host, Port, User, Password, Database e Service URI. Não compartilhe esses valores em conversas, prints ou commits.
5. Em Connect / Databases, se disponível, crie um banco exclusivo lingua_homologacao. Não use banco de produção. Baixe o CA certificate exibido pelo serviço.
6. A URI normalmente tem formato mysql://USUARIO:SENHA@HOST:PORTA/BANCO. Prefira a URI fornecida pelo painel, sem remontar a senha manualmente. Caracteres especiais precisam de percent encoding.
7. Para uma configuração local futura, crie .env (não .env.example) na raiz de uma cópia do projeto, com DATABASE_URL="mysql://USUARIO:SENHA@HOST:PORTA/BANCO". O arquivo deve estar ignorado pelo Git. O projeto atual usa process.env.DATABASE_URL; use um processo que carregue o .env explicitamente, como Node --env-file=.env, quando executar uma ferramenta compatível. Não precisa executar nada no notebook agora.
8. Para CI de homologação futuro, vá em Settings > Secrets and variables > Actions > New repository secret. Salve a URI como AIVEN_DATABASE_URL e o certificado CA como AIVEN_CA_CERT. Nunca em Variables públicas ou texto do YAML. Um workflow dedicado precisará ler esses secrets e configurar mysql2 com ssl.ca e rejectUnauthorized: true, validando o host. Não basta armazenar os secrets para que o driver atual use TLS verificado. A integração TLS com Aiven requer implementação/validação adicional; não execute migrations externas até essa autorização. Não use ssl-mode desabilitado nem desative a verificação do certificado.
9. O workflow de P0 fornecido não lê esses secrets por desenho e rejeita qualquer banco que não seja seu serviço MySQL local ao runner.

## 3. Segurança e custo
Use somente registros sintéticos, nunca dados pessoais de estudantes. Não cole senha aqui. Exclua ou desligue um serviço de homologação quando não for necessário. Confira o plano gratuito no painel, pois disponibilidade e limites podem mudar.

Documentação oficial: https://aiven.io/docs/products/mysql/concepts/mysql-free-tier e https://aiven.io/docs/products/mysql/howto/connect-from-mysql-workbench.
