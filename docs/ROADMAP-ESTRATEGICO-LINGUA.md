# Lingua — Diretriz Estratégica do Fundador e Roadmap Tecnológico

**Decisão de produto ratificada pelo fundador:** 23/11/2026  
**Status:** **DIRETRIZ OFICIAL DE PRIORIZAÇÃO**; substitui a sequência anterior que antecipava Stripe, aquisição de clientes ou Play Store.  
**Documento de execução:** este roadmap orienta o trabalho; não é autorização irrestrita para merges, alterações de banco, uso de credenciais, acoplamento, deploy ou lançamento. Cada intervenção sensível depende da aprovação e validação correspondentes.

## A decisão central

> **Primeiro construir uma inteligência educacional extraordinária; depois consolidar sua integração em produto; só então investir prioritariamente em distribuição e monetização.**

**Ordem oficial e sequencial:**

1. **Naruto:** elevar a qualidade do tutor LLM e seu método de ensino ao máximo que nossos testes, recursos e conhecimento permitirem.
2. **CSLE:** retomar e aprofundar o desenvolvimento do motor pedagógico independente.
3. **Naruto + CSLE:** integrar os dois sistemas sob contratos auditáveis, com governança do Lingua.
4. **Correções:** validar, aperfeiçoar e estabilizar integração, arquitetura, pedagogia e experiência.
5. **Fases posteriores:** reconstrução visual, acessibilidade/contas (incluindo recuperação de senha e login social), beta com alunos, publicação web/lojas, aquisição, precificação e cobrança na sequência que for aprovada.

**A meta antiga de 100 pagantes deixa de ser requisito para voltar a desenvolver o CSLE ou para propor sua integração.** Foi uma hipótese de prioridade comercial superada pela decisão explícita do fundador. Não substituir por uma promessa de acoplamento imediato: a **Fase 03** exige maturidade técnica, testes e autorização formal do fundador.

Este plano é orientado por qualidade; a busca por excelência não elimina a medição de resultados nem justifica gasto ou complexidade sem benefício demonstrável.

---

## Fase 01 — Naruto: tutor LLM de excelência

### Objetivo
Desenvolver um professor conversacional de inglês excepcionalmente compreensível, paciente, contextual, adaptativo e rigoroso, **sem depender ainda da inteligência real do CSLE**. O trabalho envolve prompts, políticas determinísticas, roteiros de ensino, estado de sessão, conteúdo, instrumentos de avaliação, modalidades e testes — não pressupõe treinar um modelo-base próprio.

### Frentes de trabalho
1. **Auditoria do Naruto atual:** mapear desde a primeira mensagem até resposta, voz, privacidade, memórias, ferramentas, limitações e custos. Separar implementado, simulado e apenas especificado.
2. **Constituição Pedagógica v0.1 como norma:** usar as quatro camadas (princípios, repertório, motor de decisão, avaliação) e o **CAL: Observar → Ensinar → Praticar → Retomar → Transferir → Comprovar**, com adaptação transversal.
3. **Didática para início absoluto:** começar em pt-BR para quem declara não saber inglês, tradução imediata, um passo por turno, verificação de compreensão, correções respeitosas e redução gradual do apoio conforme o aluno demonstra capacidades.
4. **Repertório de estratégias:** recuperação ativa antes da resposta, explicação contextual, diálogos progressivos, tarefas reais, repetição distribuída quando autorizada, metacognição, leitura/escuta, comparação de exemplos e shadowing nos limites técnicos disponíveis.
5. **Honestidade pedagógica:** não inventar certificações, níveis, fatos pessoais, tempo de experiência ou progresso; não diagnosticar fonemas com base somente em transcrição de fala; não atribuir CEFR por três perguntas.
6. **Continuidade e consentimento:** concluir QA de memória aprovada (gravar/recuperar/excluir/recusar/contas isoladas), sem converter memória pessoal em prova de aprendizagem.
7. **Observação e avaliação honesta:** distinguir fala do aluno, interpretação, sugestão e evidência. Instrumentação de dados **somente após aprovação própria**, com minimização e proveniência.
8. **Eficiência:** avaliar latência, robustez e custo por turno; preferir melhorias dentro da chamada de IA existente quando confiáveis; testar limites e falhas sem prejudicar o aluno.

### Critérios de conclusão (não automáticos)
- Conjunto versionado de **cenários de teste**: iniciante absoluto, aluno intermediário, ambiguidade, frustração, assuntos profissionais, pergunta inesperada, mudança de idioma e retorno dias depois.
- Casos críticos passam: português acessível quando necessário; nenhuma qualificação profissional fabricada; incerteza em ASR; consentimento respeitado; dados de outra conta inacessíveis.
- Sessões estruturadas demonstram **compreensão, recuperação sem pista e transferência em tarefa nova**, com rubricas e observações separadas de autodeclarações.
- Comparação com uma referência pedagógica forte, inclusive medição de **falhas, custo, latência e consistência**, sem afirmar superioridade mundial antes da evidência.
- Deep audita as propostas e o fundador autoriza a passagem de fase. **Os testes de exclusão e isolamento de memória continuam pendências importantes**, ainda que o teste entre sessões privadas tenha sido positivo.

### Próxima ação prática
**Começar pela auditoria funcional + matriz de capacidades do Naruto + bateria P0 de cenários reais de ensino**. Não começar por pagamentos ou mudança cosmética de interface.

---

## Fase 02 — CSLE: aprofundamento do motor independente

### Objetivo
Retomar CSLE como motor especializado de decisão educacional, **fora do app Lingua e sem ligação em produção** durante seu desenvolvimento.

### Base e controles
- Preservar como referência o checkpoint independente **CSLE v3.18.20** e sua bateria sintética reportada (~989 testes); **testes sintéticos não equivalem a acoplamento real nem eficácia pedagógica real**.
- Auditar conceitos, constituição, arquitetura, contratos, métricas, estados pedagógicos, seleção de estratégias, acompanhamento longitudinal, incerteza, custo e resiliência.
- Reproduzir os testes e criar casos adversariais, comparadores e avaliações em dados **sintéticos ou autorizados**, sem transferir dados pessoais do Lingua para desenvolvimento.
- Manter claro que **Lingua é autoridade** para currículo oficial, consentimento, patrimônio de aprendizagem, registros de evidência e governança certificadora. **CSLE propõe**, não decreta domínio nem certifica.
- **SRS agenda retorno**; suas datas e logs não provam competência.
- Conservar versionamento, testes reprodutíveis, limites de custo, logs sanitizados, rollback e independência dos repositórios/serviços.

### Critério de conclusão
Motor validado em laboratório isolado, interfaces documentadas, casos adversariais cobertos, avaliação honesta de ganhos frente a um comparador apropriado e parecer técnico favorável; proposta explícita de acoplamento para autorização.

---

## Fase 03 — Acoplamento Naruto ↔ CSLE

### Objetivo
Produzir o **sistema educacional integrado** imaginado pelo fundador: Naruto interage e ensina; CSLE observa estados autorizados, analisa e propõe intervenções, e Lingua valida e governa a execução.

### Sequência segura
1. Definir contratos tipados e versionados para observações, propostas, contexto, autorização, confiança, proveniência, limites de custo e falhas.
2. Implementar **adaptador de laboratório**, testes de contrato e simulações; impedir que mock seja tratado como CSLE real.
3. Avaliar regressões e integridade de currículo, consentimento, memória pessoal, SRS, evidências, isolamento entre alunos e revogação de consentimento.
4. Conduzir integração limitada, reversível e observável em ambiente de teste; **não ativar automaticamente em staging/produção**.
5. Promover apenas com relatório de auditoria Deep e **aprovação explícita do fundador para o acoplamento real**.

### Invariantes
- Nenhum agente pode salvar ou certificar domínio apenas por texto gerado pela LLM.
- O aluno controla autorizações e memórias; o sistema respeita segregação de contas e dados institucionais.
- Falha do CSLE não destrói a experiência: Naruto/Lingua mantêm fallback seguro e explicável.
- Não contaminar projetos ou repositórios legados; não substituir versões estáveis sem revisão e possibilidade de rollback.

### Critério de conclusão
Integração provada por testes de contrato + cenários reais/simulados, medições de retenção/transferência, governança verificada, custo/latência conhecidos, comportamento reversível e aprovação para avançar.

---

## Fase 04 — Correções e estabilização do produto integrado

- Corrigir incompatibilidades, duplicações de estado, erros de decisão, regressões pedagógicas, UX que atrapalha o ensino e falhas de operação.
- Realizar testes de integração, experiência guiada, avaliações de tarefa com rubricas, retenção diferida e transferência; documentar resultados inconclusivos.
- Validar segurança, consentimento, isolamento, exclusão/exportação de dados, observabilidade, desempenho, limites de custo e recuperação.
- Concluir revisão do produto integrado com o fundador/Deep, priorizando correções que impactam **aprendizagem real** em vez de número de funcionalidades.
- Só encerrar esta fase com um núcleo coerente e testável; a decisão de avançar é expressa, não automática.

---

## Fases posteriores — Produto, distribuição e monetização

A ordem interna das fases posteriores pode ser definida depois do diagnóstico da Fase 04, sem violar correções obrigatórias de segurança desde já.

- **Experiência visual e navegação:** identidade viva, hierarquia, trilhas/missões e progresso fundamentado; prototipagem antes de grandes mudanças; acessibilidade.
- **Contas:** recuperar senha, login com Google e, conforme a necessidade, Apple/Facebook e outros; fluxos seguros de autenticação, vinculação, token e tratamento de dados.
- **Validação e distribuição:** testes com usuários reais, beta web inicialmente, melhorias de onboarding, publicação em lojas caso justificada pelo público e recursos.
- **Comercialização:** precificação, suporte, custos, planos, pagamentos e aquisição de clientes.

**Stripe:** PR [#32](https://github.com/looksai/Lingua/pull/32) fica **DRAFT / CONGELADA**, sem merge, sem migration `0008`, sem habilitar `STRIPE_BILLING_ENABLED`, sem configurar novas chaves por obrigação imediata e sem cobranças reais. Seu código fica preservado para futura auditoria e homologação. Qualquer reativação precisa de decisão explícita do fundador.

**Play Store:** não é bloqueio para desenvolver ou testar o núcleo tecnológico; não é uma tarefa da Fase 01.

---

## Governaça de engenharia e papéis

- **Fundador:** define prioridade, visão, custos e autorização explícita de alterações significativas/integração/deploy/migrations.
- **GPT / engenharia:** pesquisa, propõe contratos, escreve planos/código em branches autorizadas, cria testes, explicita limites; não declara QA ou integrações ainda não executadas como concluídas.
- **Deep / auditoria:** revisa propostas e evidências, identifica riscos, verifica aceitação e recomenda correções; não substitui aprovação do fundador.
- **Lingua:** autoridade de currículo, consentimento, patrimônio oficial e certificação. **Naruto** é agente de interação pedagógica; **CSLE** é motor de propostas; **SRS** agenda retorno.
- **Mudanças de banco e infraestrutura:** sempre considerar backup recuperável, migrações controladas, ambiente correto, testes, rollback e autorização específica.
- **Dados e ciência:** informar o que foi observado, o que é inferência e o que foi provado. Não inventar resultados, prometer fluência ou atribuir qualificação sem avaliação adequada.

## Mudanças em relação ao roteiro anterior

| Ponto anterior | Nova decisão |
|---|---|
| Stripe/Paywall como próximo desenvolvimento | **Pausado e preservado na PR #32** |
| Primeiro encontrar clientes e precificar | **Após o núcleo tecnológico e a estabilização**, com experimentação pedagógica controlada antes, quando útil |
| CSLE congelado até 100 pagantes | **Meta comercial revogada como condição**. CSLE volta na **Fase 02** |
| Integração CSLE depois de monetizar | **Fase 03**, após maturidade do CSLE e **autorização explícita** |
| Reformular a aparência antes do núcleo de ensino | **Fases posteriores**, salvo correções necessárias à usabilidade pedagógica |
| Tratar o tutor como produto final | **Naruto é parte do sistema**, cujo diferencial almejado será Naruto + CSLE, sujeito a prova de eficácia |

## Referências e precedência

- [Constituição Pedagógica v0.1](./CONSTITUICAO-PEDAGOGICA-v0.1.md): princípios, estratégias e ciclo CAL; sua regra de priorização anterior é alterada **somente onde conflitante** por este roadmap.
- [Visão de Produto](./PRODUCT-VISION.md): visão conceitual, sem afirmar funções não implementadas; a sequência de desenvolvimento é substituída por esta decisão.
- [Issue #36](https://github.com/looksai/Lingua/issues/36): pesquisa de mercado, UX e conta, agora subordinada a este roadmap.
- [PR #32](https://github.com/looksai/Lingua/pull/32): trabalho de billing preservado, não autorizado para merge/ativação nesta fase.

**Precedência em caso de conflito:** decisões explícitas e mais recentes do fundador registradas neste roadmap governam **ordem de fases e portões comerciais**; Constituição pedagógica e controles de segurança permanecem em vigor. Revisões posteriores exigem decisão documentada, não inferência automática.
