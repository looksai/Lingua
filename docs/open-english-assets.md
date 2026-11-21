# Conteúdo open/free para o aplicativo Lingua

## Resposta executiva

Há uma combinação viável de texto, áudio, voz e pronúncia para o Lingua, mas “gratuito no site” não significa “livre para copiar e redistribuir”. A adoção inicial deve privilegiar fontes com licença explícita e rastreável: **Mozilla Common Voice** para voz/fala e ASR, **Tatoeba** para frases, **CMUdict** para pronúncia lexical, **LibriSpeech** para áudio alinhado a transcrições e **LibriVox** para audiolivros. **VOA Learning English** é uma fonte pedagógica especialmente forte e declara domínio público para material produzido exclusivamente pela VOA, mas exige triagem por item para excluir conteúdo de terceiros. **Wiktionary** é útil para léxico e IPA, porém traz CC BY-SA/GFDL e, portanto, obrigações de compartilhamento/atribuição que precisam ser resolvidas na arquitetura do produto.

O **British Council LearnEnglish** é excelente para desenhar currículo, níveis e tipos de atividade, mas seus termos padrão autorizam acesso pessoal/não comercial, não a incorporação em um produto. Deve ser usado como referência e por links, salvo licença comercial escrita.

Não encontrei falhas de pesquisa nos resultados fornecidos. As classificações abaixo preservam as incertezas declaradas nas fontes; não tratam qualquer fonte como universalmente livre sem verificação do item, da versão e da jurisdição.

## Classificação prática

### 1. Pode ser redistribuído no produto, sujeito à licença e à revisão indicada

#### Mozilla Common Voice — voz e fala comunitária

**O que oferece:** clipes de fala roteirizada e espontânea, transcrições, frases, metadados de locale, duração, validação e, opcionalmente, dados demográficos. É a principal fonte para banco de vozes, testes de ASR e variação de sotaques; não fornece por si só avaliação acústica de pronúncia.

**Base de uso:** as releases catalogadas no Mozilla Data Collective aparecem sob [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), permitindo copiar, modificar, distribuir e usar comercialmente sem atribuição obrigatória. A documentação oficial está em [Mozilla Common Voice Datasets](https://commonvoice.mozilla.org/en/datasets), com dados de privacidade em [Common Voice Privacy](https://commonvoice.mozilla.org/privacy/en.html).

**Condições para o Lingua:** usar a release/locale específica, registrar datasheet e versão, filtrar clipes não validados e minimizar idade, gênero e sotaque. Embora a CC0 não imponha atribuição, exibir “Mozilla Common Voice / Mozilla Data Collective” com release e URL é boa prática. Implementar takedown: a política prevê remoções solicitadas por contribuidores, especialmente em fala espontânea. Não usar vozes para identificar, perfilar ou sugerir endosso de pessoas.

#### LibriSpeech ASR corpus (OpenSLR SLR12) — áudio + texto/alinhamento

**O que oferece:** aproximadamente 1.000 horas de fala inglesa lida, segmentada e associada a transcrições, com conjuntos train/dev/test. É útil para listening, leitura acompanhada, alinhamento e avaliação de ASR, mas não é um curso por níveis nem diálogo cotidiano.

**Base de uso:** [OpenSLR SLR12](https://www.openslr.org/12) declara **CC BY 4.0**. A licença permite uso comercial, redistribuição e adaptação, desde que haja atribuição, link para a licença/material e indicação de modificações. O corpus deriva de gravações LibriVox e textos do Project Gutenberg; a página reconhece que o status de domínio público subjacente pode variar fora dos EUA.

**Condições para o Lingua:** manter aviso CC BY 4.0, projeto/URL, versão dos arquivos, checksums e alterações de resegmentação/normalização. Antes de distribuição global em escala, revisar a situação das obras/gravações nos mercados-alvo. Para pronúncia, o [SLR11](https://www.openslr.org/11/) é recurso separado e não deve ser confundido com o SLR12; conferir sua licença independentemente.

#### LibriVox — audiolivros

**O que oferece:** audiolivros em MP3/M4B/OGG, catálogo e API de metadados, geralmente sem transcrição sincronizada ou anotação pedagógica. Serve para listening autêntico e literatura, sobretudo em níveis intermediário/avançado.

**Base de uso:** a [política oficial de domínio público da LibriVox](https://librivox.org/pages/public-domain/) declara que as gravações são domínio público e podem ser usadas, vendidas, transmitidas, cortadas, remixadas e transformadas, sem obrigação de crédito. A própria LibriVox, contudo, ressalva que essa segurança é principalmente para os EUA e recomenda verificar a situação fora deles e por obra/tradução. A API está documentada em [LibriVox API](https://librivox.org/api/info).

**Condições para o Lingua:** adotar apenas itens auditados por obra, edição/tradução e jurisdição. Preservar ID, título, autor/tradutor, leitor, URLs, data de coleta e hash. Atribuição com link, embora não obrigatória, deve ser padrão de proveniência. Não presumir que a API autoriza hospedagem como CDN nem que todo texto associado tem o mesmo status da gravação.

#### Tatoeba — frases e pares de tradução

**O que oferece:** frases em inglês, traduções, IDs, idiomas, autores, tags, exports e API; áudio existe, mas a licença é por contribuição. É adequado para exercícios de tradução, exemplos controlados e prática do tutor.

**Base de uso:** a página de [downloads da Tatoeba](https://tatoeba.org/en/downloads) informa regime geral **CC BY 2.0 FR**, com parte das frases em **CC0 1.0**. O [Termo de Uso](https://tatoeba.org/en/terms_of_use) e a documentação da [API](https://api.tatoeba.org/) deixam claro que licenças são granulares. Áudios podem ser CC BY, CC0, CC BY-NC, CC BY-ND, CC BY-SA ou não autorizados para uso externo.

**Condições para o Lingua:** ingerir primeiro apenas texto/frases cuja licença, autor e URL estejam preservados. Manter atribuição por item e versão do export; filtrar erros, conteúdo ofensivo, traduções não naturais e frases inadequadas. Para áudio, só redistribuir arquivos que permitam explicitamente uso comercial e os derivados necessários à transcodificação; excluir NC/ND e itens sem autorização clara. Não tratar o corpus bruto como uma licença única.

#### CMU Pronouncing Dictionary (CMUdict) — pronúncia lexical

**O que oferece:** cerca de 134 mil entradas em inglês norte-americano, pronúncias ARPAbet, stress e variantes. Não contém áudio, alinhamento, ASR nem pontuação acústica.

**Base de uso:** o [repositório oficial CMUdict](https://github.com/cmusphinx/cmudict) inclui LICENSE e README que permitem uso comercial e redistribuição, exigindo manter copyright, condições e disclaimer. O GitHub marca a licença como “Other/NOASSERTION”; não substituir o texto oficial por MIT, domínio público ou outro rótulo.

**Condições para o Lingua:** incluir o LICENSE integral em notices/attributions, citar Carnegie Mellon University, registrar commit/versão e rotular as formas como referência de inglês norte-americano sujeita a erros. Usá-lo com outro componente para áudio, reconhecimento e avaliação de fala; ele não é, sozinho, um pronunciador ou tutor acústico.

### 2. Pode ser incorporado, mas exige atribuição, normalização ou obrigações copyleft específicas

#### VOA Learning English — cursos, notícias, áudio, vídeo e pronúncia

**O que oferece:** cursos *Let’s Learn English 1/2*, níveis Beginning/Intermediate/Advanced, notícias em velocidade reduzida, textos, MP3, podcasts/RSS, vídeos legendados, gramática, vocabulário e a série *How to Pronounce*. É a fonte mais forte para âncoras curriculares de adultos.

**Base de uso:** a [solicitação oficial de conteúdo da VOA](https://learningenglish.voanews.com/p/5373.html) declara que textos, MP3s, fotos e vídeos de **VOA Learning English produzidos exclusivamente pela VOA** estão em domínio público e podem ser reimpressos para fins educacionais e comerciais, com crédito. Os [termos gerais](https://learningenglish.voanews.com/p/6861.html) fazem distinção semelhante. Porém, páginas/programas podem conter AP, Reuters, AFP ou outros materiais de terceiros, que não podem ser republicados sem autorização. Não há uma licença Creative Commons versionada nem uma API pública geral; há [podcasts/RSS](https://learningenglish.voanews.com/podcasts) e o [USAGM Direct](https://www.bbgdirect.com/learning-english).

**Condições para o Lingua:** selecionar somente itens claramente produzidos pela VOA, preservar URL original, data, metadados e crédito visível (“Fonte: VOA Learning English / learningenglish.voanews.com”), excluir material de terceiros e não reutilizar logo/marca como branding ou sinal de endosso. Para um banco comercial persistente, solicitar confirmação escrita à VOA/USAGM, inclusive pelo canal indicado em [Request Our Content](https://www.usagm.gov/work-with-us/content-requests/voa/). Se a triagem não for possível, manter link/embedding oficial em vez de cópia.

#### Wiktionary dumps — léxico, definições, flexões e IPA

**O que oferece:** dump XML do English Wiktionary, definições, classes, exemplos, flexões, etimologias, traduções e pronúncia/IPA quando presentes. Áudios são arquivos externos e devem ser tratados individualmente.

**Base de uso:** o dump oficial está em [Wiktionary dumps](https://dumps.wikimedia.org/enwiktionary/). O conteúdo lexical geral é dual-licensed sob **CC BY-SA 4.0** e **GFDL**, conforme a [página do projeto](https://en.wiktionary.org/wiki/Wiktionary:Main_Page). A CC BY-SA exige atribuição, indicação de modificações e licenciamento compatível de material adaptado. Mídia no Wikimedia Commons tem licença própria por arquivo; consultar [Commons Licensing](https://commons.wikimedia.org/wiki/Commons:Licensing/en).

**Condições para o Lingua:** manter URL/entrada ou lista equivalente de autores, licença, versão/data do dump e aviso de modificações. Não misturar áudio com o dump sem auditar a página de cada arquivo. Antes de colocar o conteúdo em uma base fechada, obter revisão jurídica sobre a interação entre CC BY-SA/GFDL e dados/currículo proprietário. Se o produto não puder cumprir ShareAlike, usar consulta/link ou não ingerir.

### 3. Gratuito para consumo no site, mas não para copiar para o produto sem autorização

#### British Council LearnEnglish — cursos e recursos didáticos

**O que oferece:** materiais por níveis A1–C1/C2, reading, writing, listening, speaking, gramática, vocabulário, séries de áudio com transcrições, vídeo e exercícios. É excelente referência para sequenciamento CEFR, desenho de tarefas e seleção de temas adultos.

**Base de uso:** [LearnEnglish](https://learnenglish.britishcouncil.org/) e seus [termos gerais](https://www.britishcouncil.org/terms) / [termos dos apps](https://learnenglish.britishcouncil.org/terms-of-use-for-apps) não indicam licença aberta. Os termos autorizam acesso/cópia para uso pessoal e não comercial, restringem republicação, modificação, separação de áudio/vídeo/imagens e incorporação em outro produto, e podem envolver titulares terceiros.

**Condições para o Lingua:** usar como referência e link para a página oficial. Não copiar MP3, transcript, PDF, vídeo, exercício, embeddings/indexação ou derivados para o banco do Lingua. Solicitar licença comercial escrita ao British Council e, quando necessário, aos titulares terceiros antes de incorporar qualquer item.

## Fontes a evitar até esclarecer a licença

1. **Qualquer item VOA que inclua AP, Reuters, AFP, fotos, gráficos, clipes ou adaptações de terceiros.** O acesso por RSS, podcast ou página não resolve os direitos.
2. **Áudio Tatoeba sem auditoria individual**, especialmente itens CC BY-NC, CC BY-ND, CC BY-SA incompatíveis com a arquitetura, ou sem autorização externa clara.
3. **Áudio do Wiktionary/Commons sem a licença da página do arquivo.** A licença do dump textual não cobre automaticamente a mídia.
4. **Obras LibriVox e gravações LibriSpeech sem revisão territorial**, sobretudo traduções e itens que serão distribuídos fora dos EUA.
5. **Qualquer fonte gratuita cuja licença não esteja identificada ou que ofereça apenas streaming/consumo no site.** Não inferir direitos de redistribuição a partir de download disponível.
6. **British Council LearnEnglish copiado para dentro do app**, até haver autorização comercial escrita.

## Ordem recomendada de adoção

1. **Fundação de pronúncia e frases:** CMUdict para formas lexicais e stress; Tatoeba somente com texto/licença por item. Criar desde o início o modelo de atribuição e versionamento.
2. **Voz e ASR:** Mozilla Common Voice, começando por um subset inglês revisado, minimizado e documentado. Usar inicialmente para avaliação interna e feedback de fala; só depois redistribuir áudio bruto no app.
3. **Listening alinhado:** LibriSpeech, com CC BY e proveniência completa, para exercícios de áudio-texto e testes do tutor.
4. **Currículo adulto:** VOA Learning English, após triagem de direitos por item e confirmação escrita para o escopo comercial. Usar níveis/séries como âncoras e excluir terceiros.
5. **Literatura e listening avançado:** LibriVox, por obra e jurisdição, com transcrição/alinhamento gerados ou obtidos separadamente.
6. **Léxico ampliado:** Wiktionary, somente quando o produto conseguir cumprir CC BY-SA/GFDL e manter a atribuição; caso contrário, limitar a consulta externa.
7. **Referência pedagógica:** British Council, por links e estudo de currículo; negociar licença apenas se houver uma necessidade clara de incorporar seus assets.

## Arquitetura de ingestão recomendada

Cada asset deve entrar por um pipeline versionado, com quarentena jurídica e técnica antes de ficar disponível ao tutor.

### Manifesto mínimo por fonte e item

```yaml
source_id: voa-learning-english
source_name: VOA Learning English
official_url: https://learningenglish.voanews.com/
source_version: "data-de-acesso-ou-release"
retrieved_at: "2026-11-20T00:00:00Z"
license: "public-domain-voa-only / item-specific-review"
license_url: https://learningenglish.voanews.com/p/5373.html
license_confidence: medium
attribution: "Fonte: VOA Learning English / learningenglish.voanews.com"
language: en
locale: en-US
level: B1
curriculum_anchor: "listening.news.slow-news"
item_id: "id-estavel-da-fonte"
source_url: "url-original-do-item"
text: "texto ou transcrição normalizada"
audio_uri: "asset-interno-ou-url"
timestamps:
  - start_ms: 0
    end_ms: 1800
    text: "segmento"
voice:
  speaker_id: "pseudonimo-ou-id-nao-identificante"
  accent: "en-US"
  consent_status: "documented-or-not-applicable"
  demographics: "minimized"
transformations: ["resegmented", "normalized-volume"]
third_party_rights: "none-found / review-required"
hash: "sha256"
status: "quarantine"
```

### Regras do pipeline

- **Manifesto de fonte e licença:** registrar fonte, URL oficial, versão/release, data de coleta, licença literal, URL da licença, confiança e escopo. Nunca substituir “incerto” por uma licença presumida.
- **Atribuição:** gerar automaticamente uma página de créditos e, quando necessário, créditos por item. Preservar autor, leitor, contribuidor, projeto, licença e URL.
- **Idioma e nível:** separar idioma, locale/sotaque, dialeto e nível curricular. Nível CEFR deve ser uma classificação da Lingua, não uma alegação da fonte, salvo quando a fonte explicitamente o informa.
- **Texto e áudio:** manter o original imutável, uma camada normalizada e uma camada didática derivada. Guardar checksums, formato, duração, sample rate, canais e transformações.
- **Timestamps:** representar alinhamento palavra/frase com `start_ms`/`end_ms`, indicando se é fornecido pela fonte ou produzido pelo Lingua e qual método/versão foi usado.
- **Voz e consentimento:** para Common Voice, armazenar apenas o identificador necessário, status da release, locale e consentimento conforme a política; minimizar dados demográficos. Não inferir identidade, consentimento comercial amplo ou endosso.
- **Âncora curricular:** vincular cada item a uma unidade/objetivo, por exemplo `A2.listening.daily-routines`, `B1.news.main-idea`, `pronunciation.word-stress`. A licença não deve ser confundida com validação pedagógica.
- **Proveniência e takedown:** manter grafo `item -> fonte -> release -> licença -> transformação`; aceitar remoção/correção e propagar a retirada para caches e pacotes distribuídos.
- **Separação por licença:** não misturar em um arquivo indistinguível conteúdos CC0, CC BY, CC BY-SA, domínio público condicionado, material de terceiros e conteúdo apenas linkado. A UI de créditos deve refletir a licença real de cada componente.
- **Quarentena:** itens com `license_confidence` baixa, direitos de terceiros, consentimento ausente ou licença incompatível não entram no catálogo distribuído; podem permanecer em uma fila de revisão ou ser referenciados por link.

## Conclusão

O caminho mais seguro é começar com **CMUdict + Tatoeba textual + Common Voice revisado + LibriSpeech**, adicionando **VOA** após triagem de direitos e confirmação de escopo. **LibriVox** amplia o listening, mas exige cautela territorial. **Wiktionary** é valioso, porém só deve entrar quando o Lingua puder cumprir as obrigações CC BY-SA/GFDL. **British Council** deve permanecer como referência/link até uma autorização comercial explícita. Em todos os casos, a licença do item, a proveniência, o consentimento de voz e a capacidade de remoção devem viajar junto com o asset, do download até a experiência final do aluno.
