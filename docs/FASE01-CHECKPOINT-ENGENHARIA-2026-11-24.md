# Lingua — Checkpoint de engenharia Fase 01 (24/11/2026)

**Objetivo:** registrar fatos reproduzíveis e limites após o fundador delegar condução técnica direta ao GPT durante indisponibilidade temporária de Deep/Claude. Este documento **não** substitui CI, QA humano autenticado ou a Constituição do Lingua.

## Estados de código verificados

| Frente | Pull request | Commit main | CI anterior ao merge |
| --- | --- | --- | --- |
| Proteção ASR (CAL catálogo e piloto Hello) | [#46](https://github.com/looksai/Lingua/pull/46) | `5c85293cef0f67acaaf507bf5f57f5230da8aca8` | [run 45341438697](https://github.com/looksai/Lingua/actions/runs/45341438697) — success |
| Controle único de áudio Naruto, compatível com #46 | [#47](https://github.com/looksai/Lingua/pull/47) | `7c366b513f5695922b8a3a8dc77812d5604b1a83` | [run 45346020901](https://github.com/looksai/Lingua/actions/runs/45346020901) — success |
| Implementação original de áudio, preservada como histórico | [#45](https://github.com/looksai/Lingua/pull/45) | não mergeada; substituída por #47 | histórico de auditorias |

Os testes de CI contemplam `pnpm check`, `pnpm test`, `pnpm build`, **mas não executam testes reais em navegador nem avaliação empírica de aprendizagem**.

## Proteção de proveniência ASR (#46)
- `TutorChat` envia `inputModality: "typed"|"asr_text"` a `tutor.reply`; origem de microfone permanece `asr_text` após correções no texto, e é preservada em retry.
- Cliente sem campo no backend é tratado conservadoramente como não digitado, sem pontuar tarefa fechada.
- Catálogo CAL e piloto Hello exigem modalidade explícita em `prepare()`; exercícios não tratam ASR como resposta digitada. Ajuda, pausa e retomada orais podem navegar sem contabilizar erros.
- Testes cobrem diretivas, hints, estados e ausência de campo. O contrato `placement.submit` é distinto (`text|asr_text`) e não afirma pontuar speaking.
- O campo ainda é **declaração do cliente, não atestação de origem**. **Proibido** reutilizar como evidência curricular oficial, pronúncia, retenção, CEFR ou certificação.

## Voz Naruto (#47)
- `audioActionFor` e `resolveTutorAudio` decidem um único controle por mensagem: neural, voz local, retry, player ou welcome.
- Voz local para exemplo inglês exige voz inglesa instalada; nunca usar voz exclusivamente portuguesa para demonstrar pronúncia inglesa.
- Botão neural tenta `audio.play()` uma única vez após gerar TTS; autoplay pode ser bloqueado em Safari/Android e player deve permanecer disponível.
- Início de microfone e mudança de conversa/consentimento procuram interromper áudio e impedir a associação de resultados assíncronos à conversa errada.
- Testes unitários de política, matriz de estados e seleção de vozes foram executados no CI. Não há teste de interface React nem teste Chrome/Android/Safari.

## Ambiente
- Render staging: `https://lingua-p1-staging-le7u.onrender.com`; serviço `srv-dc0mh2cs728c73ant6e0`, auto-deploy desativado.
- Deploy ASR #46: `dep-dc2jg6u8bjmc73ft0tr0`, informado **LIVE** pelo Render em 24/11.
- Deploy #47: `dep-dc2jhim8bjmc73ft4b9g` disparado. Confirmar status final via API do Render; não presumir LIVE.
- Flags CAL e catálogo foram anteriormente reportadas ativas em staging; verificar na fonte antes de afirmar que permanecem assim.
- Nenhuma migration, Stripe, SRS/CSLE ou `learnerEvidences` foi modificada nessas PRs. Não executar migration 0008 sem decisão explícita específica.

## QA que NÃO ocorreu
1. Login humano com duas contas e isolamento; exclusão e revogação de consentimento/memória.
2. Responder em voz durante tarefa fechada em catálogo e Hello; confirmar que fase/observações não pontuam ASR.
3. Digitado após limpar transcrição, edição parcial e retry de rede sem troca de proveniência.
4. Neural funciona/falha com e sem voz local inglesa; navegador com apenas pt-BR; sem voz local.
5. Reprodução/pausa, áudio ao gravar, sessão trocada durante geração, aviso de autoplay bloqueado.
6. Chrome desktop/Android/Safari iOS; loading e erro de capacidades; mensagem de boas-vindas.

## Próximos portões técnicos
- Confirmar deploy #47 e integridade geral em staging; distinguir LIVE do QA autenticado.
- Tornar o QA de regressão do tutor reproduzível com teste de interface e automação quando viável; fazer roteiro humano para particularidades do microfone.
- Tratar explicitamente explicação em português sem usar voz PT-BR como **modelo de pronúncia inglesa** (decisão de produto).
- Validar fases RETOMAR, TRANSFERIR, COMPROVAR e comparador CAL vs prompt; não declarar Fase 01 completa sem evidência.
- Antes de **qualquer registro de evidência**: desenho/validação de atestação de transcrição no servidor, consentimento, descarte de áudio, exclusão e isolamento de contas.
- Somente depois avançar o laboratório oral (ASR sem avaliação acústica), e posteriormente avaliação de pronúncia real por experimento controlado. CSLE continua desacoplado.

**Governança:** fundador delegou implementação e decisões técnicas; manter transparência, registro dos commits, testes e limitações. Deploy staging e alterações de baixo risco podem ser conduzidos tecnicamente. Não experimentar em produção, billing ou dados pessoais persistentes sem controles apropriados.
