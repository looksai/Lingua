# P1 — conexão MySQL externa com CA verificado

**Status:** preparação na branch `fix/p1-aiven-tls`, sem acesso ao banco, sem migrations, sem alterações na main ou deploy. Arquivo `ca.pem` do fundador foi verificado localmente como certificado X.509 CA válido (não é chave privada), mas **não foi incluído no Git**. O nome exato da base, versão e a identidade TLS do servidor ainda exigem teste real autorizado.

## Como funcionará

O backend usa `mysql2/promise.createPool` através de Drizzle. Se `DATABASE_URL` aponta para servidor externo, exige `DATABASE_SSL_CA_BASE64`: conteúdo PEM do CA da Aiven codificado em Base64. O driver recebe `ssl: { ca: PEM, rejectUnauthorized: true }`. Configuração ausente/CA malformado = falha fechada, sem conexão externa em texto claro. URL com `ssl-mode=REQUIRED` não substitui a configuração explícita do mysql2. Testes P0 no MySQL local descartável seguem sem CA. A opção do pool limita conexões a cinco para não sobrecarregar o plano de avaliação.

## Como configurar no Render, depois da aprovação do deploy

1. No painel Aiven, confirme que a senha **já redefinida** é a atual e faça download do **CA atualizado** caso a Aiven tenha girado a autoridade.
2. Mantenha os dois valores **fora do Git e do chat**: `DATABASE_URL` com a **senha nova**, e `DATABASE_SSL_CA_BASE64` (Base64 do **conteúdo** do `ca.pem`). O Base64 não é criptografia. A codificação pode ser feita no dispositivo do fundador ou num processo local confiável; **não envie o certificado a conversores de sites aleatórios**.
3. Insira os valores nas variáveis privadas do Web Service Render. `render.yaml` declara as duas como `sync: false`.
4. **Não aplicar** o Blueprint nem iniciar deploy antes de resolver compatibilidade OAuth Manus, validar custos e autorizar explicitamente o serviço Web Free.
5. Depois que existir um ambiente de staging, executar **somente inspeção read-only**: conexão TLS e identidade do hostname, `SELECT VERSION()`, `SELECT DATABASE()`, `SHOW TABLES`; conferir banco-alvo e ausência de dados reais.
6. Somente mediante aprovação separada e banco confirmado como exclusivamente de homologação, aplicar migrações 0000/0001/0002 em procedimento revisado. O comando genérico `drizzle-kit migrate` **não herda automaticamente** esta configuração TLS e não deve ser usado em bancos remotos até ser ajustado e auditado.
7. Verificar `SHOW STATUS LIKE 'Ssl_cipher'` na sessão de teste como evidência adicional de criptografia; isso **não substitui** a validação de cadeia/hostname no cliente. Registrar apenas resultados sanitizados.
8. Monitorar créditos e vencimento do trial/free na Aiven; não converter plano nem ativar cobrança automática por esta tarefa.

**Limites:** os testes unitários de configuração do CA usam somente fixture pública da trust store Node e não provam handshake real com Aiven. O certificado pode rotacionar antes do vencimento nominal. O segredo do banco redefinido não está disponível neste branch e não deve ser recuperado do histórico da conversa.

Referências: https://aiven.io/docs/platform/concepts/tls-ssl-certificates , https://orm.drizzle.team/docs/get-started/mysql-existing , https://sidorares.github.io/node-mysql2/docs/documentation/ssl .
