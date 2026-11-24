# Fase 01 — Protocolo de QA do Naruto (ASR, áudio e isolamento)

**Estado:** testes manuais PENDENTES. Este documento é um roteiro de execução e registro, não um relatório de testes concluídos.

**Versão mínima para testar:** `12fb8eef37924c12d4040ad9746cddc4fdc15f19` na `main` (PR #49), com #46 e #47 integradas. Confirmar o commit realmente **Live** no Render ANTES da execução. URL: https://lingua-p1-staging-le7u.onrender.com.

**Controle de risco:** usar contas A e B **de testes** e frases fictícias; não compartilhar senhas, tokens, gravações reais, dados sensíveis ou prints com informações pessoais. Nenhum teste pode modificar produção, migration 0008, billing, CSLE ou evidências curriculares oficiais.

## Critérios de aceite

A1. Nenhum resultado de mensagem, transcrição, TTS ou proposta de memória de A pode reaparecer em B, após logout ou troca de conta.
A2. Um pedido pendente da conversa apagada/revogada não pode preencher o chat, o rascunho, áudio ou memória novamente.
A3. Um pedido antigo não pode desabilitar/reativar o indicador `busy` de uma operação posterior.
A4. Um recorder antigo não pode encerrar uma captura nova ou permitir que o navegador continue transmitindo sem ação explícita.
A5. Uma resposta de voz convertida em texto **não** contabiliza acerto, erro, pronúncia nem avanço de tarefa fechada CAL; a digitação independente continua podendo gerar apenas um candidato pedagógico local.
A6. Autoplay pode falhar por política do navegador, mas player nativo deve permanecer e a UI não pode reportar sucesso inexistente.
A7. Consentimento revogado impede **novos envios** e limpa áudio/cache transitório da interface; requisições já enviadas podem terminar no servidor, mas seus resultados não devem ressuscitar a sessão local.

## Matriz de QA

| ID | Cenário | Procedimento | Resultado esperado | Evidência observada |
| --- | --- | --- | --- | --- |
| T01 | Resposta lenta e conta trocada | Entrar A, enviar pergunta, simular rede lenta, sair e entrar B antes de concluir | Resposta e proposta de memória de A nunca aparecem em B | PENDENTE |
| T02 | ASR lenta e conversa apagada | Entrar A, gravar com autorização, iniciar transcrição, apagar conversa antes da resposta | Rascunho e indicador ASR continuam vazios | PENDENTE |
| T03 | Revogação após envio | Iniciar TTS/ASR autorizado, revogar enquanto aguarda | Sem cache de áudio/rascunho antigo após a revogação | PENDENTE |
| T04 | Operação antiga versus nova | Iniciar operação A, mudar escopo, iniciar operação B antes de A terminar | A não libera o `busy` da B, nem impede a B | PENDENTE |
| T05 | Permissão de microfone atrasada | Solicitar `getUserMedia`, mudar conta enquanto diálogo de permissão estiver aberto | Stream tardio é fechado e não começa gravação na nova conta | PENDENTE |
| T06 | Evento `onstop` obsoleto | Cancelar gravação e iniciar outra após troca de escopo | Evento da antiga não limpa/cancela a nova | PENDENTE |
| T07 | Fala ASR em tarefa catálogo | Criar tarefa fechada; responder pelo microfone | Tarefa/observações não pontuam resposta falada; aviso explícito | PENDENTE |
| T08 | Fala ASR em piloto Hello | Em ambiente configurado para piloto antigo, responder tarefa pelo microfone | Nenhuma observação/acerto/erro, sem crash | PENDENTE |
| T09 | Digitação depois de limpar ASR | Transcrever frase, apagar completamente, digitar independentemente | Proveniência da nova mensagem é `typed`; não altera o histórico anterior | PENDENTE |
| T10 | Edição parcial da transcrição | Transcrever, editar sem apagar tudo, enviar | Proveniência continua `asr_text` | PENDENTE |
| T11 | Fallback de voz inglês | Testar dispositivo com apenas pt-BR, com en-US e sem voz instalada | Nunca usar voz pt-BR como exemplo de pronúncia inglesa | PENDENTE |
| T12 | Autoplay e concorrência de players | Ouvir duas respostas e iniciar microfone; testar Chrome desktop/Android/Safari iOS | Um áudio por vez; bloqueio de autoplay usa player manual | PENDENTE |
| T13 | Boas-vindas entre sessões | Gerar áudio de boas-vindas, apagar/trocar de conta antes de finalizar | Áudio não reaparece na sessão seguinte | PENDENTE |
| T14 | Memória/consentimento entre contas | Aprovar memória fictícia em A e inspecionar B; revogar; excluir em A | Sem memória de A em B; exclusão aplicada; sem texto antigo visível | PENDENTE |

## Como registrar resultados

Para cada ID: data/hora, commit Live, navegador/versão, dispositivo, conta A/B **identificadas apenas por apelidos não reversíveis**, cenário, comportamento observado, aprovado/reprovado/bloqueado e referência ao issue se necessário. Não anexar transcrições reais, áudios ou dados pessoais.

**Gate de promoção:** qualquer vazamento entre contas, gravação sem consentimento, ou ASR contado como evidência é P0/P1 e bloqueia expansão. Resultados não executados não podem ser marcados como aprovados.

## Evidências automatizadas que já existem
- PR [#46](https://github.com/looksai/Lingua/pull/46): guardas ASR dos runtimes CAL e testes unitários/de integração de router.
- PR [#47](https://github.com/looksai/Lingua/pull/47): política de áudio única, fallback local inglês e testes determinísticos.
- PR [#49](https://github.com/looksai/Lingua/pull/49): proteção por epoch, exclusão de resultado atrasado, propriedade de `busy` e eventos de `MediaRecorder`. CI [45348826798](https://github.com/looksai/Lingua/actions/runs/45348826798) — TypeScript/testes/build sucesso.

**Limites declarados:** testes Vitest puros não simulam permissões reais do navegador, dois logins simultâneos, Safari iOS ou latência variável do serviço. Não declarar Phase 01 concluída nem avançar evidências persistidas sem QA e prova das etapas RETOMAR/TRANSFERIR/COMPROVAR.
