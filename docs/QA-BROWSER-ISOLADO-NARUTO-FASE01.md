# Lingua / Naruto — QA de navegador isolado, sem contas reais

**Data:** 24/11/2026. **Escopo:** componentes React do tutor e Chromium headless; **não** é uma jornada autenticada ponta a ponta.

## Por que esta suíte existe
Até a PR #62, o CI de Fase 01 exercitava funções puras e renderização SSR, mas não comprovava a interação real de clique, viewport, mudança de estado e resposta assíncrona no DOM. Esta PR adiciona um primeiro degrau verificável, sem acoplar banco de alunos ou serviços externos.

## Implementação

- `client/qa/catalog-ui.html` / `client/qa/catalog-ui.tsx`: fixture **sintética**, que monta os componentes **originais** `TutorCatalogTaskView` e `TutorAudioControls` sem copiá-los para um mock. Os controles da fixture fornecem tickets fictícios, chave de atividade, ACK falso e callbacks de áudio simulados. **Não** se usa voz, microfone, LLM ou rede externa.
- `tests/browser/vite.qa.config.ts`: Vite mínimo em `127.0.0.1:4178`, **sem** Express, scripts de debug do Manus ou conectores de produção.
- `tests/browser/run-browser-qa.mjs`: Chromium headless com Playwright em contexto limpo por caso, interceptando e bloqueando requisições a qualquer host diferente de `127.0.0.1:4178`. Testes declaram resultado `PASS` ou falham o job inteiro.
- `.github/workflows/browser-qa.yml`: workflow separado e sem secrets ou permissões de escrita. Dependência `playwright@1.56.1` instalada em diretório temporário, **sem modificar `package.json` ou `pnpm-lock.yaml`**. Roda apenas no evento de PR com arquivos de browser/controles relevantes ou acionamento manual.

## Matriz real de componente, 7 cenários

| ID | Ação no Chromium real | Evidência esperada |
| --- | --- | --- |
| BR-01 | Atividade fora do viewport, depois scroll para o card | Sem ACK antecipado; um evento de exibição e nenhuma duplicação ao rolar novamente |
| BR-02 | Simular falha da confirmação e permitir retry por clique | Erro visível; segundo envio e erro removido somente após sucesso |
| BR-03 | Desabilitar `IntersectionObserver` no navegador | Sem ACK automático; botão de confirmação manual utilizável |
| BR-04 | Tornar a área/consentimento inativos, rolar e reativar | Nenhum ACK enquanto inativo; botão desabilitado até reativação |
| BR-05 | Adulterar o texto, tornando-o incompatível com o ticket | Sem card de atividade validada, sem controle de confirmação nem ACK |
| BR-06 | Clicar ações de áudio neural, local e boas-vindas; trocar states | Callback exato, bloqueio durante gravação/permissão pendente, ação única |
| BR-07 | Viewport móvel 390×844 | Texto visível e um recibo após scroll, sem duplicar card |

Esses cenários testam comportamento do componente React dentro de **Chromium headless**. BR-07 usa uma **emulação de largura**, não um telefone físico. A fixture não possui nenhum mecanismo para acessar ou atualizar o progresso real do Lingua.

## O que permanece PENDENTE

- QA autenticado real com duas contas de teste contra tutor/servidor, sessão CAL e tickets emitidos pelo backend;
- Chrome Android **em dispositivo real** e Safari iOS, além de dispositivos com microfone e `speechSynthesis`;
- autoplayer, captura ASR, permissões reais `getUserMedia`, voz neural e política de consumo;
- re-login entre contas, cold start Render, timeout, logout, exclusão, revogação com resposta em trânsito, duas abas e observações reais;
- cronogramas `RETOMAR`, `TRANSFERIR`, `COMPROVAR` e comparador controlado CAL versus prompt;
- persistência oficial, consentimento pedagógico persistido, atestação de origem e transações MySQL reais.

**Honestidade de evidência:** sucesso desta suíte só autoriza afirmar que sete interações dos componentes passaram num Chromium de CI. Não atesta que o Naruto foi homologado com alunos, nem prova aprendizagem, segurança completa ou eficácia pedagógica.

## Como executar localmente (ambiente isolado)

```bash
pnpm install --frozen-lockfile
npm install --prefix /tmp/lingua-browser-tools --no-save --ignore-scripts --no-audit --no-fund playwright@1.56.1
/tmp/lingua-browser-tools/node_modules/.bin/playwright install chromium
pnpm exec vite --config tests/browser/vite.qa.config.ts --host 127.0.0.1 --port 4178 --strictPort
# outro terminal:
LINGUA_QA_PLAYWRIGHT_DIR=/tmp/lingua-browser-tools node tests/browser/run-browser-qa.mjs
```

Sem necessidade de credenciais, cookies, acesso ao banco ou staging. O runner bloqueia URLs fora do servidor local.

**Política operacional:** uma falha de instalação do Chromium ou do workflow não pode ser convertida em teste aprovado; registrar como bloqueio e corrigir o laboratório antes do merge.
