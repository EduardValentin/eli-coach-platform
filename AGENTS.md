# Agent Instructions

Repository-specific operating rules. Treat the companion documents as binding.

## Sources of Truth

- `ARCHITECTURE.md`: boundaries, layering, PWA scope, and deployment model.
- `DESIGN.md`: implemented design system and accessibility direction. Keep it synchronized with `designs/react-reference-app/DESIGN.md`.
- `PRD.md`: product requirements and canonical domain vocabulary. Rename existing vocabulary when the PRD changes; do not create synonyms.
- `README.md`: local setup and project links.
- `designs/react-reference-app/`: React reference prototype.

Before implementing from a ticket, prototype, PRD, or recent branch:

- Fetch `origin/main` and inspect the referenced commit or file.
- Restart stale previews before evaluating behavior or copy.
- Do not rely on memory, screenshots, or stale servers.

## Runtime and Setup

- Package manager: pnpm `10.33.0`.
- Repo root and `apps/platform`: Node `>=24.14.1 <25`.
- `designs/react-reference-app`: use its `.nvmrc` (Node 20.19+ or 22.12+).

```bash
pnpm install
pnpm secrets:local:prepare
pnpm db:bootstrap:local
pnpm dev:all       # platform, Postgres, and prototype
pnpm dev:platform  # platform only
```

Local PostgreSQL uses `127.0.0.1:55437`. For parallel branches, override both `LOCAL_POSTGRES_PORT` and `LOCAL_POSTGRES_CONTAINER_NAME`.

## Delivery Workflow

- Track work in the Linear Eli Coach Platform project.
- Include the issue ID in every commit, for example `GEN-123 …`.
- Keep `docs/superpowers/` artifacts local and uncommitted unless explicitly requested.
- For Terms changes, update `packages/content/src/website-and-store-terms/current.ts`, bump its version and effective date, run `pnpm terms:pdf`, review `/terms`, and commit source and PDF together. Never overwrite an older Terms PDF.

Before claiming completion or opening a PR, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:lighthouse
```

Exercise UI changes in a browser. If browser verification is unavailable, state that explicitly; tests and typechecks do not prove UI behavior.

## Code

- Comments explain non-obvious reasons, not what the code does.
- Functions take at most three parameters; use an options object beyond that.
- Do not use boolean parameters; expose separate named operations.
- Prefer composition, flat control flow, explicit behavior, and purpose-revealing names.
- In `apps/platform`, import app-local modules through the app-root alias.
- Use package scripts or exposed binaries, never deep `node_modules` paths. Keep local environment loading in explicit local scripts using repository `.env` conventions.
- Build conditional Tailwind classes with `cn` object entries; avoid template interpolation and nested styling ternaries.
- Prefer existing primitives and semantic tokens. Avoid redundant utilities and custom typography/color combinations that `tailwind-merge` may collapse.

## Data and SQL

- Database state must be reproducible from migrations and application code. Never depend on manual schema edits or one-off data mutations.
- Create and apply migrations with `pnpm db:generate` and `pnpm db:migrate`.
- Bind every dynamic SQL value through ORM/tagged-template parameters. Never concatenate request data into SQL or pass it to raw-SQL APIs. Allowlist any dynamic identifiers.
- Keep SQL focused on persistence, filtering, joins, ordering, constraints, and necessary database aggregation.
- Map relational rows into JSON, API, and domain shapes in TypeScript/JavaScript. Perform such mapping in SQL only when a documented performance, atomicity, or database-native requirement justifies it.
- Feature-owned tables (defined outside `packages/db/src/schema/`, e.g. `packages/infrastructure/src/feature-flags/schema.server.ts`) must be queried with Drizzle's core query builder (`.select()`, `.insert()`, `.execute()`, etc.), never the relational query API (`db.query.*`). `createDatabaseClient` binds only `packages/db`'s own schema, so `db.query.*` is unavailable for those tables by design.

## Tests

- Co-locate tests with the code and organize them by product concept.
- Every scenario uses ordered `// arrange`, `// act`, and `// assert` sections.
- Backend unit and integration tests belong in separate files. Unit tests mock dependencies; integration tests exercise the application boundary with real infrastructure through testcontainers.
- Frontend unit and UI integration tests belong in separate files. UI integration filenames include `ui-integration` and render real components.
- Frontend API traffic must use the public request path and MSW. Do not stub `fetch`, mock API hooks, or bypass routes.
- Integration tests assert routes, statuses, redirects, persistence, and externally visible outcomes; never private helpers, logs, or implementation details.
- Feature tests assert roles, copy, state changes, and public outcomes. Restrict class assertions to reusable UI primitives whose classes are part of their contract.
- Prefer `userEvent`; use `fireEvent` only for unsupported interactions.

## Public UI

- Public prerendered routes are static shells. Load database-backed state at runtime through APIs.
- Keep third-party verification behind adapters; the server verifies provider tokens before domain logic runs.
- Production UI is Tailwind-first. Prefer primitives and semantic tokens over raw colors, arbitrary typography, or duplicated spacing, radius, and shadow values. Arbitrary values are acceptable only for non-reusable layout mechanics.
- Each page has exactly one `<h1>` with non-skipping heading levels.
- Provide labeled `main`, `nav`, and `aside` landmarks where applicable.
- Prefer native semantics; add ARIA only for relationships native HTML cannot express.
- All interactions must be keyboard-operable.
- Animations require a layout-stable `prefers-reduced-motion` fallback.
