# Plano de integração de conteúdo — Lingua

## Decisão executada

O Lingua integra quatro fontes em uma fronteira de conteúdo versionada e auditável. O produto não trata qualquer fonte como certificação, nota ou domínio. Cada item preserva origem, licença, versão, hash quando disponível e estado de revisão.

A prioridade de áudio é:

1. **LibriSpeech / OpenSLR SLR12** para listening acompanhado, áudio segmentado, transcrição alinhada e validação do pipeline Whisper.
2. **LibriVox** para escuta extensiva, literatura e exposição a diferentes leitores; o conteúdo entra primeiro como catálogo e só é redistribuído após revisão por obra e jurisdição.
3. **Common Voice**, em lote posterior, para diversidade de fala, sotaques e testes de ASR. Não será usado como autorização automática para clonagem ou TTS.

## Lotes

### Lote 1 — integrado agora

- **CMUdict:** dataset local completo com 135.166 entradas, pronúncia ARPAbet e variantes. O aviso de licença foi preservado em `client/public/content/CMUDICT-LICENSE.txt`.
- **Tatoeba textual:** 24 frases em inglês com licença, autor, ID e URL por item. O subset só inclui registros CC BY 2.0 FR ou CC0 e permanece marcado para revisão pedagógica.
- **Manifesto:** `client/public/content/manifest.json` registra função, licença, atribuição, quantidade, hash e estado operacional.

### Lote 2 — catalogado e pronto para subset

- **LibriSpeech / OpenSLR SLR12:** fonte e URL do `dev-clean` registradas. O áudio grande não entra no Git; deve ser baixado por subset, verificado por checksum e enviado ao armazenamento de objetos com atribuição CC BY 4.0.
- **LibriSpeech preview:** quatro segmentos individuais foram obtidos pelo Dataset Server, salvos como WAV local, associados às transcrições e verificados com SHA-256. O tarball completo não foi mantido.
- **LibriVox:** catálogo local com seis itens via API. O áudio permanece externo até revisão de obra, tradução, gravação e jurisdição.
- **Preview LibriVox:** o primeiro capítulo do catálogo é reproduzível pelo URL oficial do RSS/Archive, sem cópia ou hospedagem pelo Lingua; isso permite validar a experiência de listening enquanto a revisão de redistribuição permanece aberta.

### Lote 3 — próximo

- Baixar um subset pequeno e curado de LibriSpeech, com segmentos curtos, transcrições, idioma, checksums e atribuição.
- Criar ingestão para armazenamento durável, sem servir arquivos de licença incerta.
- Adicionar Common Voice com filtros de locale, validação, privacidade e takedown.

### Lote 4 — editorial

- Selecionar unidades da VOA Learning English produzidas exclusivamente pela VOA.
- Preservar crédito e URL original.
- Excluir itens com conteúdo de terceiros ou mantê-los como link oficial até confirmação escrita.

## Estados do catálogo

- `integrated-with-notice`: conteúdo local disponível com aviso de licença.
- `integrated-needs-pedagogical-review`: conteúdo local disponível, mas não deve virar evidência sem curadoria.
- `catalogued-download-on-demand`: fonte conhecida, áudio pesado baixado somente em subset controlado.
- `catalogued-territorial-review`: item catalogado, redistribuição bloqueada até revisão por jurisdição.
- `quarantine`: licença, procedência, consentimento ou takedown insuficiente.

## Comandos

```bash
pnpm content:ingest
pnpm check
pnpm test
pnpm build
```

O ingestador é idempotente por substituição dos artefatos gerados e escreve em `client/public/content/`. Ele não baixa automaticamente os arquivos de áudio grandes; isso é intencional para proteger desempenho, armazenamento, atribuição e revisão de direitos.

## Limites pedagógicos

Os bancos fornecem material de aprendizagem e teste. Nenhum áudio, transcrição, acerto isolado, frase de Tatoeba ou resultado do Whisper será convertido automaticamente em domínio, certificação ou decisão do CSLE. A futura análise de fala continua atrás do contrato de observação, revisão humana, consentimento e incerteza.
