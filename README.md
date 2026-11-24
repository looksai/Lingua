# Lingua — Inglês que acompanha seu caminho

## Diretriz oficial de desenvolvimento (23/11/2026)

**Prioridade: Naruto (qualidade pedagógica) → CSLE (motor independente) → acoplamento auditado → correções e estabilização → produto/distribuição/monetização.**

- [Roadmap estratégico vigente](docs/ROADMAP-ESTRATEGICO-LINGUA.md).
- [Constituição Pedagógica v0.1](docs/CONSTITUICAO-PEDAGOGICA-v0.1.md).
- [Backlog de UX, contas e pesquisa](https://github.com/looksai/Lingua/issues/36).

A meta anterior de 100 pagantes não condiciona mais o retorno ao desenvolvimento do CSLE; a integração exige autorização específica do fundador e testes. **Stripe PR #32 permanece pausada em draft, sem merge, migration 0008 ou ativação de billing.** O documento de roadmap não autoriza deploy ou modificações de banco.


React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.
