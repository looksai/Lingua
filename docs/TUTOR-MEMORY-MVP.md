# Lingua Memory — MVP com consentimento

**Status: PR candidato. Migration 0007 ainda NÃO aplicada. Funcionalidade desativada até homologação.**

## Fluxo de uma única chamada

O tutor Groq GPT-OSS 120B já usado pelo Lingua devolve, na mesma requisição de conversa, um objeto JSON contendo a resposta normal e, opcionalmente, uma sugestão de memória. Não há extrator pago, múltiplos agentes, banco vetorial ou chamadas de API adicionais. JSON adiciona alguns tokens por mensagem; portanto, não prometer custo ou latência rigorosamente zero.

A sugestão precisa ser uma citação LITERAL da última mensagem do aluno. Backend rejeita trechos inexistentes, longos ou potencialmente sensíveis. O tutor pergunta num cartão: "Posso guardar uma lembrança para personalizar suas próximas aulas?", mostrando o texto exato e os botões Guardar e Agora não. **Nenhuma sugestão é persistida sem o clique de Guardar.**

No clique, o servidor valida token HMAC assinado e temporário (10 minutos), vinculado à conta, verifica origem da requisição e grava apenas a informação confirmada. Limite de 50 fatos por aluno; deduplicação por hash; origem student_confirmed_chat; categorias profession, goal, interest, preference. Consulta os últimos cinco registros autorizados por userId antes da próxima resposta. Exposição de memórias como dados, nunca como instruções. Falha de leitura não impede a conversa normal.

O aluno pode ver/apagar individualmente ou todas as memórias nas configurações. Essa memória Aiven é persistente entre dispositivos, distinta do histórico local com 24 mensagens e TTL de 30 dias. Nenhum dado da memória altera avaliação CEFR, registros oficiais, SRS ou CSLE.

**Fatos autodeclarados não são fatos verificados**. A ausência de registro de certificação significa "desconhecida", não "não certificado". Um guard reduz determinados tipos de alucinação, mas não garante eliminar todas, nem uma suposta redução de 90%. O modelo pode retornar JSON inválido; isso deve ser medido antes de abrir a funcionalidade.

## Migração e governança

Arquivo drizzle/0007_learner_memories_staging.sql: CREATE TABLE aditivo em MySQL com FK de userId para users.id ON DELETE CASCADE, índice de recência, índice de duplicidade por conta e factHash. Não executar db:push.

1. Revisão do PR e autorização explícita do Deep/fundador.
2. Confirmar o Aiven *staging Lingua* (banco, hostname, TLS/CA, owner, 0005, 0006, ausência de learnerMemories) e backup restaurável, sem expor segredos.
3. Executar migration 0007 em workflow de operações segregado com pré e pós-checagens. DDL MySQL não pode ser revertido apenas com ROLLBACK.
4. Só depois fazer merge e deploy no Render. Configurar LINGUA_TUTOR_MEMORY_ENABLED=true exclusivamente na conta de staging aprovada. O padrão é false/ausente.
5. Homologar com conta adulta e informações fictícias: Guardar, Agora não, duplicidade, expiração, cross-account, exclusão, cinco fatos, refresh, falha do banco, injection, chaves e custos. Não habilitar cobrança.

## Privacidade

O MVP escolhe consentimento explícito por fato, mas isso não significa que a LGPD exija consentimento como base para todo e qualquer processamento. Avaliar política de privacidade, finalidade, acesso, correção, exclusão, retenção e usuários menores antes de produção. Não guardar automaticamente dados sensíveis ou segredos; verificações textuais são conservadoras e imperfeitas. A memória deve ser limitada a declarações pessoais úteis ao ensino de inglês, não para treino de modelos.

## Referências
- https://console.groq.com/docs/structured-outputs
- https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes
