# P0 — Tutor acessível para iniciante absoluto (staging; para revisão)

## Problema observado no teste do fundador
O aluno disse "não sei nada de inglês" em mensagens de chat; apesar disso, o Groq respondeu com `Great! You can say ... Ready to practice?` e `You work as a welder. Try saying ...`. O prompt geral já exigia respostas em pt-BR, mas não havia uma proteção de saída. O aluno não deve precisar decifrar as orientações antes de aprender.

## Alterações restritas
- Um detector conservador observa **somente** mensagens do aluno e memórias **já autorizadas** para identificar pedidos explícitos de começar do zero / não entender inglês. Não grava nível, não estima CEFR e não transforma inferência em memória.
- O mesmo sinal é transmitido aos adaptadores **Groq** e **OpenAI** no prompt existente, sem novo agente nem chamadas extras. Exige instrução e pergunta em português, um microexemplo inglês com tradução e avanço lento.
- Uma barreira de saída identifica respostas *predominantemente* em inglês e as substitui por instrução simples em português, preservando apenas a informação profissional explicitamente declarada pelo aluno. O conteúdo do modelo ainda passa antes pela barreira existente contra invenção de certificações/anos de experiência.
- Mantém `memoryCandidate` existente, sem salvar fatos sem o clique explícito `Sim, guardar`; não altera SQL, Render, Stripe, CSLE, SRS ou cobrança.
- Os testes cobrem as frases reais, não promoção automática de nível, ausência de qualificação inventada, ambos adaptadores e ausência de custo extra de requisição.

## Limitações honestas
- O detector de inglês dominante é **heurístico**, não valida toda frase ou a correção fonética. O fallback local é simples por segurança e precisa de QA com alunos reais.
- O sinal de iniciante vem da mensagem/histórico recente e das memórias expressamente consentidas. Sem estas evidências, a política geral continua sendo pt-BR primeiro, mas não há um novo nível durável inserido clandestinamente no banco.
- A geração de propostas de memória depende da resposta do modelo e validação de citação literal; se o professor não oferecer `Sim, guardar`, isso é uma questão de QA distinta, não prova de recuperação da memória.
- Após merge aprovado, testar com conta **staging**: negar/autorizar tratamento, dizer `Não sei nada de inglês`, testar `Ready to practice?`/tradução, confirmar perguntas em português, perguntar sobre trabalho na mesma sessão, verificar que o tutor não menciona certificação ou anos não informados. Testes reais de memória exigem prompt `Sim, guardar`, reload e nova sessão isolada.
- Se a barreira substituir resposta inadequada por texto genérico, o app deve deixar o aluno avançar só em passos pequenos; evolução pedagógica mais sofisticada requer validação futura.

**Deploy/merge condicionado à aprovação do fundador e do Deep.**
