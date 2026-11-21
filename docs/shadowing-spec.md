# Especificação de Shadowing

## 1. Princípio

Shadowing continua praticável sem sessão autenticada, banco, rede ou serviço de fala. O feedback é formativo, não é nota, não certifica domínio e não vira evidência pedagógica automaticamente.

## 2. Camada local obrigatória

A camada local compara o áudio de referência e o áudio gravado no navegador. Ela calcula:

- `referenceDurationMs` e `learnerDurationMs`;
- `durationRatio` e `durationDeviationPercent`;
- `pauseThresholdMs` (300 ms por padrão);
- `pauseCount` e `pauseDurationMs`, usando energia RMS por janelas de 20 ms;
- `pauseRate`, proporção do tempo do estudante em pausa;
- uma orientação textual determinística: ritmo próximo, ritmo mais lento/rápido ou atenção às pausas.

O cálculo usa somente buffers de áudio já disponíveis localmente. Não calcula fonemas, pronúncia, inteligibilidade, alinhamento lexical, significado, correção gramatical ou proficiência. Ausência de microfone apenas remove as métricas do áudio do estudante; a prática sem gravação continua disponível.

## 3. Camada remota opcional

A transcrição Whisper permanece no pipeline separado de gravação/transcrição do Laboratório de Leitura. Quando autorizada, pode acrescentar texto segmentado, idioma e incerteza para revisão humana. Ela não é necessária para o exercício de shadowing, não bloqueia feedback local e falhas remotas devem degradar silenciosamente para o resultado local. O shadowing não envia áudio automaticamente ao CSLE.

## 4. Contrato de dados

```ts
type ShadowingFeedback = {
  source: "local";
  deterministic: true;
  referenceDurationMs: number;
  learnerDurationMs?: number;
  durationRatio?: number;
  durationDeviationPercent?: number;
  pauseThresholdMs: number;
  pauseCount?: number;
  pauseDurationMs?: number;
  pauseRate?: number;
  guidance:
    | "steady"
    | "slow-down"
    | "slow-up"
    | "notice-pauses"
    | "listen-again";
  limitations: string[];
};
```

O feedback vive no estado da sessão do componente; não é persistido no banco nem na fila offline. Uma futura camada remota pode ser anexada como observação opcional, sempre com proveniência e incerteza próprias.
