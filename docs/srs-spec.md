# Especificação do SRS do Lingua

**Status:** fonte da verdade do serviço SRS do checkpoint P0.

## 1. Escopo

O SRS agenda retornos. Ele não estima proficiência, não certifica domínio e não substitui evidências de compreensão, aplicação ou transferência.

## 2. Estado

Cada item possui `state`, `easeFactor` (EF), `intervalDays`, `repetitions`, `lapses`, `dueAt` e, quando aplicável, `lastReviewedAt`.

- `new`: nunca avaliado.
- `learning`: percorrendo passos curtos.
- `review`: intervalo em dias segundo SM-2.
- `relearning`: um item de revisão que recebeu `again` e voltou a passos curtos.

## 3. Qualidade e respostas

A resposta do produto é mapeada diretamente para a qualidade SM-2:

| Resposta | `quality` | Intenção                                      |
| -------- | --------: | --------------------------------------------- |
| `again`  |         0 | esquecimento; reinicia ou entra em relearning |
| `hard`   |         3 | lembrou com esforço                           |
| `good`   |         4 | lembrou adequadamente                         |
| `easy`   |         5 | lembrou com facilidade                        |

A qualidade é registrada no `reviewLog`; ela não é uma nota pedagógica.

## 4. Fórmula SM-2

Para qualquer resposta, primeiro calculamos:

```text
EF' = clamp(1.3, 3.0,
  EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
```

`q` é `quality`, `EF` é o fator anterior e `clamp` aplica piso e teto. O EF inicial é `2.5`.

A fórmula do EF é aplicada antes da promoção para `review`. Em particular, `easy` a partir de `new`, `learning` ou `relearning` atualiza o EF (por exemplo, 2.5 → 2.6), mas usa um intervalo fixo de 4 dias; não é calculado como `4 * EF'`.

Na fase `review`:

- `again` (`q=0`): `lapses += 1`, `repetitions = 0`, entra em `relearning`, com primeiro passo de 1 minuto; o intervalo em dias volta a 0.
- `hard` (`q=3`): `interval = round(interval anterior * 1.2)`. O multiplicador fixo evita punir duas vezes o item: o EF já diminui pela fórmula e aplicar EF' novamente ao intervalo reduziria excessivamente a próxima revisão.
- `good` (`q=4`): `interval = round(interval anterior * EF')`.
- `easy` (`q=5`): `interval = round(interval anterior * EF' * 1.3)`.

Todo intervalo de revisão tem piso de 1 dia. O teto operacional do intervalo é 3650 dias (10 anos), para impedir datas não operacionais.

## 5. Learning e relearning

Os passos são, em ordem: **1 minuto, 10 minutos, 1 dia**.

- Em `new`, `again` fica no passo de 1 minuto; `hard` e `good` avançam um passo; `easy` promove imediatamente para `review` com 4 dias.
- Em `learning`, `again` volta ao passo de 1 minuto; `hard` repete o passo atual; `good` avança um passo; `easy` promove para `review` com 4 dias. Ao concluir o passo de 1 dia, a próxima resposta não-`again` promove para `review`.
- Em `relearning`, a mesma sequência é usada: `again` reinicia em 1 minuto; `hard` repete o passo atual; `good` avança; `easy` promove. Ao concluir o passo de 1 dia, retorna a `review` com intervalo de 1 dia ou, para `easy`, 4 dias.
- Ao promover, `repetitions` fica em pelo menos 1. Ele é um contador operacional de passagens pelos passos/revisões; não altera a fórmula de intervalo em `review`, que usa o intervalo anterior e EF'.
- `again` em `relearning` não incrementa `lapses`: o lapso já foi contado quando o item em `review` recebeu `again`; repetir a falha durante a recuperação não representa um novo lapso de revisão.

## 6. Jitter e arredondamento

Para intervalos em dias, o próximo intervalo é multiplicado por um fator uniforme em `[0.95, 1.05]`. O serviço aceita uma fonte pseudoaleatória injetável para testes; em produção usa uma semente determinística derivada de `userId`, `itemId`, estado, resposta e repetição. Incluir usuário e item espalha itens revisados juntos entre vencimentos diferentes, enquanto a mesma operação reenviada com a mesma entrada produz o mesmo jitter. Passos de minutos não recebem jitter.

Depois do jitter, o valor é limitado a `[1, 3650]` e arredondado ao inteiro mais próximo. A data é calculada a partir de agora, não de `dueAt`, para que um item vencido não acumule atraso artificial no próximo intervalo. `dueAt` é armazenado em UTC; a exibição converte a data para o fuso horário do usuário. Portanto, não existem frações de dia persistidas. O rótulo de exibição arredonda apenas a diferença entre datas para minutos/horas/dias.

## 7. Exemplos normativos

Com `agora = 2026-11-20T12:00:00Z` e jitter desativado nos exemplos:

| Estado de entrada             | Resposta | Saída esperada                             |
| ----------------------------- | -------- | ------------------------------------------ |
| `new`, reps 0                 | `again`  | `learning`, 1 min                          |
| `new`, reps 0                 | `good`   | `learning`, 10 min                         |
| `learning`, reps 1            | `good`   | `learning`, 1 dia                          |
| `learning`, reps 2            | `good`   | `review`, 1 dia                            |
| `new`, reps 0                 | `easy`   | `review`, 4 dias, EF 2.6                   |
| `review`, interval 6, EF 2.5  | `again`  | `relearning`, 1 min, lapses +1             |
| `review`, interval 10, EF 2.5 | `hard`   | `review`, 12 dias antes do jitter, EF 2.36 |
| `review`, interval 10, EF 2.5 | `good`   | `review`, 25 dias antes do jitter, EF 2.5  |
| `review`, interval 10, EF 2.5 | `easy`   | `review`, 34 dias antes do jitter, EF 2.6  |

Os exemplos com intervalo em dias assumem arredondamento e jitter desativado apenas para facilitar auditoria; a execução normal aplica jitter.
