# Academy Beta — retomada visual PR #105

Kit original recebido em 25/11/2026: Lingua_Kit_Visual_Web_Designer(1).zip (40 entradas), acompanhado do Documento Mestre V2.1. Referência aprovada: 1672 × 941. O hero limpo é regenerado, não camada original; fidelidade pixel a pixel não está demonstrada.

## Integração implementada
- O fundador publicou os oito assets em client/public/academy/. Os oito hashes Git conferem com os bytes do pacote original.
- Landing.tsx utiliza a logo, quatro ícones, edifício e composição pedagógica ilustrativa. CSS utiliza o hero fotográfico e a textura do mapa.
- Login.tsx recebeu a identidade visual da Academy, preservando os procedimentos de autenticação existentes.
- Navegação horizontal, rotas /login e /demo, layout responsivo e foco visível; sem CTAs para módulos indisponíveis ou métricas fictícias na landing.
- server/academy-visual-assets.test.ts contém dez casos de regressão (oito SHA-256 e dois testes de referências/rotas). Ainda não há execução confirmada desses testes.
- Commits: 76a3324 (landing), 19ecb41 (CSS), 9b9daa4 (login), e598575 (CSS login), 4decaee (testes).

## Gates antes de convidar alunos
- CI verde no SHA final. Último CI confirmado anterior à integração dos assets: run 45571520786, commit bb89d4e. PR estava mergeable antes das últimas mudanças; continua draft.
- Homologação visual em navegador real: contraste, teclado, zoom, larguras 320/375/768/1440, assets sem erros e comparação com referência. Não realizada neste bloco.
- Bloqueador funcional identificado em inspeção de server/routers.ts: auth.signUp aceita email e senha e não exige convite. Não confundir parceiro convidado com aluno convidado. Implementar e testar gate de cadastro no servidor, revogação/política de admissão, limites de custo e isolamento antes de abrir a Academy.
- Validar onboarding, tutor, prática, revisão, consentimento, falhas de voz, persistência de sessão e isolamento de duas contas; suporte e rollback, ausência de cobrança involuntária.
- Homologação humana em staging antes de abertura. Não ativar Stripe, CSLE ou produção por este documento.

## Limites
Transferência binária resolvida pelo upload do fundador. Sem merge, deploy ou alteração de banco neste bloco. A implementação de código não equivale a homologação visual ou autorização de lançamento.
