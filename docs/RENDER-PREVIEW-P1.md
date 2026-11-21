# Render staging — guia para o fundador (ainda NÃO implantado)

Este guia é uma proposta. Nenhum serviço, URL, conta, banco ou credencial foi criado. O arquivo render.yaml só tem configurações. O fundador deve revisar e autorizar o deploy.

## Segurança antes de criar o preview

1. O Lingua combina React/Vite com backend Express/tRPC e OAuth da plataforma Manus. Não basta um site estático: login, callbacks OAuth e cookies precisam funcionar no novo domínio HTTPS. Se o provedor Manus não oferecer callbacks externos, o preview não estará apto a testar autenticação até existir um modo de QA seguro, avaliado separadamente.
2. O preview padrão do Render fica acessível publicamente na internet. O plano Free não é uma barreira privada de acesso. Proteger acesso por camada confiável ou manter apenas fixtures não sensíveis; nunca expor dados de estudantes ou lógica proprietária sem revisão de segurança. Não simplificar autenticação para facilitar o teste.
3. O workflow MySQL do GitHub é descartável, não é banco persistente do Render. O Lingua exige MySQL exclusivo de homologação (Aiven Free será encerrado em 21/12/2026), com SSL/TLS validado e apenas dados sintéticos. Nunca inserir DATABASE_URL de produção. Render Free oferece web service e Postgres, mas a aplicação não suporta Postgres sem trabalho adicional.
4. render.yaml desliga auto-deploy e fixa a branch P1, não main. Nenhum segredo é versionado. A rota /api/health confirma só que o HTTP iniciou; não garante autenticação, DB nem sincronização.

## Passo a passo (futuro, sem instalar nada no Celeron)

1. Criar conta em https://dashboard.render.com/, verificar preço Free e cotas. Conectar GitHub apenas ao repositório privado looksai/Lingua com o menor escopo possível.
2. Escolher New → Blueprint, selecionar o repositório e a branch P1 e revisar render.yaml. A criação de um novo serviço pode causar o primeiro deploy: não confirmar até que acesso, OAuth e MySQL de teste estejam validados.
3. Informar os segredos de homologação exigidos no painel do Render (nunca por PR ou conversa). Confirmar cookies seguros e callback HTTPS de teste.
4. Depois da aprovação do fundador e do Deep, iniciar um deploy manual. Observar o build e /api/health; em caso de falha, registrar somente mensagens sem tokens, cookies ou senhas.
5. Abrir a URL onrender.com do ambiente aprovado no Chrome/Edge, em duas abas e duas contas sintéticas. Desconectar rede, enfileirar, reconectar, trocar contas, recarregar e confirmar ACKs sem perdas; registrar resultados.
6. Desligar/remover o serviço de QA quando não for necessário; revisar custos antes de sair do Free.

**Limites do plano Free:** o serviço pode dormir após 15 minutos sem tráfego, apresentar cold start, consumir horas incluídas e usar sistema de arquivos efêmero. O plano não garante disponibilidade contínua nem privacidade de acesso.

Documentação oficial:
https://render.com/docs/free
https://render.com/docs/blueprint-spec
https://render.com/docs/web-services
https://render.com/docs/node-version


## Etapa OAuth / banco: atenção à revisão técnica

Antes de executar o Blueprint, seguir **[RENDER-OAUTH.md](RENDER-OAUTH.md)**. O código atual não usa `OAUTH_CLIENT_ID` nem `OAUTH_CLIENT_SECRET`, e o Manus WebDevAuthPublicService não deve ser confundido com Open App API OAuth. Só configurar serviços depois de verificar callback externo e TLS do MySQL. O Aiven Free para MySQL será encerrado em 21/12/2026; não assumir hospedagem gratuita persistente.
