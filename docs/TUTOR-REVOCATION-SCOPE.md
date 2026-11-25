# Tutor: revogação de requisições em andamento

PR #82. Baseline de código validada: f5fa79610bc1f19039ffb4406502e8f55ad0e0d3. P0 45550743302 e Chromium 45550743359 concluídos com sucesso.

## Escopo
- Leases por ID autenticado, em memória de uma instância. Revogação invalida leases existentes e remove sessão CAL catálogo.
- Reply, transcribe, neuralEnglish, welcomeAudio e geminiDemo verificam revogação antes da chamada externa e/ou antes da entrega, conforme fluxo. Testes HTTP sintéticos específicos cobrem reply, transcribe e neuralEnglish; não comprovam voz física nem todos os endpoints.
- UI invalida respostas atrasadas e mantém estado de revogação pendente/falha separado por conta na montagem atual.

## Limites e próximos passos
- Não é consentimento persistente no servidor. Requisições que chegam depois da revogação podem iniciar novo lease; múltiplas instâncias, abas e recargas não têm garantia global.
- Não cancela processamento externo já iniciado nem apaga dados do fornecedor. CAL legado já comprometido não é apagado; commit anterior à revogação não é revertido genericamente.
- Sem alteração de banco, Stripe, SRS, evidência oficial ou CSLE. Sem teste com aluno real. Antes de prometer revogação global, projetar autorização versionada persistente e testes de concorrência, logout e múltiplas instâncias.
- Nenhum merge/deploy confirmado neste checkpoint.
