# CAL — Portões verificáveis de RETOMAR, TRANSFERIR e COMPROVAR (Fase 01)
**Data:** 24/11/2026 · **Status:** especificação de homologação, NÃO declaração de eficácia.

## Escopo e regra de evidência
O controlador CAL permite os estados OBSERVAR, ENSINAR, PRATICAR, RETOMAR, TRANSFERIR e COMPROVAR. Essa enumeração não significa que o tutor Naruto já executa todas as etapas em condições reais. O runtime `server/cal-catalog-runtime.ts` hoje escolhe uma tarefa por pedido explícito, acrescenta seu texto à resposta, faz avaliação fechada de digitação e mantém estado em memória do processo. O ACK de entrega é **montagem da resposta pelo servidor**, não prova de que o navegador exibiu a tarefa.

Uma avaliação sintética `rule` é somente candidato, não certificado, prova de competência, nota de pronúncia ou registro oficial. ASR identifica conteúdo provável da fala; não avalia a acústica da pronúncia.

## Portões por fase

| Fase | Demonstração sintética mínima | Evidência real adicional exigida | O que NÃO basta |
| --- | --- | --- | --- |
| PRATICAR | Acerto independente de tarefa compatível, `assistance="none"` e avaliador de regra/humano | tarefa renderizada no cliente, resposta digitada realmente independente, rastreamento autorizado e QA com aluno | texto do LLM, template apenas emitido pelo servidor, acerto com modelo exposto |
| RETOMAR | Tentativa sem ajuda, em fase `RETOMAR`, decorrida janela >= 24 h após ensino, sem `asr_only`/LLM candidato | sessão durável após reinicialização e entre dias, nova tentativa autenticada em outro momento, timestamp confiável, teste com conta real | chamar `START_RECALL` em teste unitário, repetir 5 segundos depois, confiar na data do navegador |
| TRANSFERIR | Nova tarefa/contexto, diferente do contexto praticado, sucesso independente com regra verificável ou revisão humana | caso não memorizado em outro ambiente, rubrica própria, checagem de novidade e revisão humana para tarefa aberta | substituir apenas o nome/personagem sem mudar a tarefa; transcrição ASR = pronúncia; repetição de template |
| COMPROVAR | Sumário limitado, precedido de observações independentes e de oportunidades de retomada/transferência | cadeia de proveniência de tarefas, consentimento, entrega renderizada, retenção durável, trilha de auditoria, comparador e revisão de instrumentos | `phase==="COMPROVAR"`, três exemplos no mesmo chat, resposta convincente do tutor |

### Resultado técnico do diagnóstico

O helper puro `diagnoseCALProof` retorna candidatos *sintéticos* para prática independente, retomada tardia, transferência em novo contexto e sumário. A função retorna explicitamente `liveTutorValidated:false` e `certification:"not_assessed"` **mesmo que a máquina seja conduzida em testes até COMPROVAR**.

Não há persistência nova, gravação de respostas, banco de evidências, SRS ou CSLE neste trabalho. Ninguém pode usar o relatório para atribuir domínio, nível CEFR ou certificação.

### Comparador obrigatório antes de declarar benefício pedagógico

Executar, em ambiente controlado e com consentimento específico, Naruto com CAL versus Naruto usando somente instruções/prompt. Emparelhar objetivos, instrumentos, tempo de estudo e condição inicial; manter métricas de resposta independente, retenção tardia, transferência e satisfação, e analisar erros por modalidade e grupo. Não declarar superioridade sem dados reais e pré-definição dos critérios de comparação.

### Roteiro de QA humano (não executado)

1. Duas contas fictícias, cada uma com objetivo diferente; confirmar isolamento do catálogo, histórico local, áudio e memória; reiniciar serviço.
2. Pedir um exercício e observar se a tarefa **realmente apareceu no navegador**. Falha de renderização não pode ser marcada como modelo entregue.
3. Digitar resposta fechada depois de compreensão; observar candidato `PRATICAR`, sem rótulos de domínio. Responder por microfone não deve criar acerto ou erro pedagógico.
4. Após janela real de >= 24 h e nova sessão, promover apenas uma nova tarefa de recordação planejada; validar que nenhum estado foi fabricado pela UI.
5. Introduzir tarefa de transferência genuinamente distinta, com rubrica verificável e avaliador independente, sem usar frase já exposta ao estudante.
6. Gerar sumário com limites claros, distinguindo evidências observadas de ausentes. Submeter a revisão humana de conteúdo e à auditoria de privacidade.
7. Completar experimento comparador CAL versus prompt; publicar achados positivos, negativos ou inconclusivos.

### Bloqueadores atuais

- **B1:** nenhuma comprovação de renderização do template no navegador, nem teste E2E autenticado entre contas.
- **B2:** TTL e estado em memória do Render impedem provar retenção durável entre sessões/restarts.
- **B3:** fluxo do tutor real não agenda nem valida `RETOMAR`/novos contextos de `TRANSFERIR`/sumários de `COMPROVAR`.
- **B4:** tarefas abertas de transferência exigem revisão; ASR não é avaliação acústica.
- **B5:** comparador de eficácia ainda não executado.

**Decisão de engenharia:** enquanto B1–B5 não forem resolvidos e auditados, a Fase 01 não pode ser considerada pedagogicamente concluída. O código puro e o CI só comprovam lógica de máquina e integridade de build.
