# Backup independente do Aiven staging antes da migration 0007

**Status: PROPOSTA EM PR, não aprovada nem executada.** Serve apenas como plano de contingência porque o Windows 7/HeidiSQL do fundador não conseguiu conectar ao MySQL 8.4. Este procedimento exporta somente o schema `defaultdb` de staging. **Não equivale ao snapshot/PITR gerenciado da Aiven**: é backup lógico que deve ser guardado e restaurado em ambiente descartável para validação plena.

## Riscos e limites
- Os backups automáticos do plano Developer Aiven são para recuperação operacional do serviço. A Aiven informa que restauração/fork manual requer planos superiores.
- O dump pode conter dados pessoais: **nunca publicar .sql/.gz em GitHub, issues, chat ou PR.** Artefato do Actions deve conter **somente** o arquivo `.gpg` criptografado.
- No GitHub Actions o job temporariamente processa os dados em memória e transmite o dump via pipe, sem gravar um arquivo SQL em disco. Não loga valores de dados, senha, strings de conexão ou certificado. Usa cliente MySQL oficial de imagem Docker `mysql:8.4` no runner Linux.
- Este fluxo exige a presença de `LINGUA_STAGING_DATABASE_URL` e `LINGUA_STAGING_CA_BASE64` já usados pelo workflow `inspect`. Só permite host/porta/schema Aiven staging exatos, TLS verificando CA/hostname, MySQL 8.4, schema 0005/0006 e tabela 0007 ausente. Apenas `workflow_dispatch` manual em `main`. Não executa DDL.
- A saída é `lingua-pre-0007.sql.gz.gpg`, cifrada com GPG simétrico AES256, compactada com gzip. O job descriptografa em memória e valida a integridade e algumas tabelas; ainda NÃO testa restauração completa.
- O artefato expira em **3 dias**. O fundador precisa baixar e guardar pelo menos duas cópias do `.gpg` em armazenamento privado, junto com a senha em cofre **separado**. Sem senha, cópia irrecuperável; senha fraca pode ser quebrada.

## Operação segura após auditoria / merge
1. Revisar a PR do workflow e aprovar via Deep/fundador; conferir CI verde. **Ainda não rodar `apply`.**
2. Gerar senha aleatória longa (mínimo 32 caracteres, sugerido 40 ou mais) usando gerenciador de senhas. Guardá-la em local externo ao GitHub. **Não enviar em conversa nem colocar como `workflow_dispatch` input.**
3. Em `looksai/Lingua` → Settings → Secrets and variables → Actions → New repository secret: nome `LINGUA_STAGING_BACKUP_PASSPHRASE`, valor a senha forte gerada. Não reutilizar senha do Aiven/GitHub.
4. Actions → `Lingua Aiven pre-0007 encrypted backup (manual guarded)` → Run workflow → branch `main` → confirmação **BACKUP_CRIPTOGRAFADO_LINGUA_0007**.
5. Exigir job **success** com mensagens `Aiven staging target ... verified` e `Backup encrypted; decryption, gzip integrity, expected schema structures verified`. O upload do artefato deve estar sucesso. Se falhar, não há backup confirmado, não repetir `apply` ou modificar o banco.
6. Abrir a página da execução no Actions e baixar artefato `lingua-aiven-pre-0007-encrypted-<run_id>`. Guardar o arquivo `.gpg` **sem publicá-lo**, em dois locais protegidos. Registrar hora, checksum SHA256, responsável, local da cópia e modo de recuperação (em registro privado, não no PR).
7. Testar que o arquivo guardado pode ser desencriptado em ambiente confiável com GnuPG e gzip; idealmente restaurar em MySQL descartável **sem tocar no banco Aiven original**. Exemplo em Linux/macOS com `gpg` e `gzip`, após mover o arquivo a local privado:

   ```bash
   gpg --output Lingua-pre-0007.sql.gz --decrypt lingua-pre-0007.sql.gz.gpg
   gzip -t Lingua-pre-0007.sql.gz
   ```

   Atenção: esse comando gera dados pessoais em arquivo .gz no computador; execute só em dispositivo protegido e apague a cópia plaintext após conferir. Nunca restaurar por cima do Aiven atual.
8. **Só depois do backup verificado pelo fundador**, rerodar `inspect` se necessário e executar a migration 0007 por seu workflow separado, usando os campos específicos e comprovando `0007 APPLIED AND VERIFIED`. Então realizar deploy Render de staging e teste de memória.

## Não confundir
- `BACKUP_AIVEN_CONFIRMADO` no workflow 0007 é uma **declaração humana**; o job não comprova se o arquivo foi baixado/guardado.
- O fato de a Aiven mostrar backups no painel não substitui a exportação independente.
- Este workflow **não altera** as migrations, o Stripe, o CSLE, as tabelas existentes ou a configuração da Aiven.
