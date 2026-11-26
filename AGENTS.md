# Agent Instructions

Repository operating rules. `docs/architecture/`, `DESIGN.md`, and `PRD.md` are binding companions. `README.md` owns setup and commands.

## Prototype-Backed Application

This production app is backed by a reference prototype in `designs/react-reference-app`: a React single-page app with mocked backend, auth, email, and payments, and a global Dev Toggle for switching app states. The prototype is the source of truth for flows, design, domain objects, and business rules. Production must not contain features or design absent from the prototype; the prototype may run ahead of production.

- Before any work that adds or changes user-visible UI, in production or in the prototype, load the `prototype-backed-workflow` skill and follow it, including its parity gate before a PR.
- Parity artifacts live under `.parity/`: the map, pairings and states files are committed with the code, and per-session folders under the gitignored `.parity/sessions/` never are. `DESIGN.md` records current state, never parity or history.
- The prototype sits outside the pnpm workspace: npm on the same Node version, verified by its own `npm test` and `npm run build`.

## Sources of Truth

- `docs/architecture/`: the audited architecture record; `conventions.md` says where a file goes and what it may import.
- `PRD.md`: product behavior, business rules, and canonical vocabulary. Rename vocabulary when the PRD changes; never create synonyms.
- Boundary rules: `tools/dependency-cruiser.config.cjs`; published surfaces: `knip.json`. `pnpm check:boundaries` runs dependency-cruiser and then `pnpm check:surfaces` (knip), directly inside `pnpm validate` and the Docker builder stage; both are proven by `tools/boundaries.test.mjs`.

Before implementing from a ticket, prototype, PRD, or branch: fetch `origin/main`, inspect the referenced commit or file, and restart stale previews. Never rely on memory, screenshots, or stale servers.

## Project Stage

Live product on a production environment (PROD, `https://evoa.fit`).

- PROD data is never dropped, recreated, or rewritten by hand. Change it only through migrations and application code.
- Every migration keeps the previous release working: add first, remove in a later release. Rollback runs the previous image against the newer schema, so a column, table, or constraint the previous release still uses stays until a later release has shipped without it.
- LOCAL and TEST databases may still be dropped and recreated at will.
- For code that is not schema, prefer the simplest change over the compatible one. No compatibility shims, dual-write paths, or staged rollouts.

## Delivery

- Track work in the Linear Eli Coach Platform project. Prefix every commit with the issue ID (`GEN-123 …`). Ad hoc work without an issue omits the prefix; ask before assuming work is ad hoc.
- Keep `docs/superpowers/` artifacts local and uncommitted unless asked.
- Terms changes follow `docs/TERMS.md`. Store products are published only through the management API, per `docs/STORE_PUBLISHING.md`.

Before claiming completion or opening a PR:

```bash
pnpm validate
pnpm test:lighthouse
```

## Code

- Comments explain non-obvious reasons, not what the code does.
- Formatting belongs to Prettier (`pnpm format`); `pnpm lint` fails on unformatted files, so never hand-format or argue layout in review.
- At most three parameters per function; an options object beyond that. No boolean parameters: expose separate named operations.
- Components live at `apps/platform/src/bounded-contexts/<bounded-context>/<component>/`, each with the anatomy `docs/architecture/conventions.md` describes (`domain/`, `adapters/`, `public/`, `ui/`, `composition.server.ts`, `config.server.ts`, `routes.ts`). A bounded context (from Domain-Driven Design) groups the components that share one model and language; a component doesn't need a page of its own.
- A function created to serve one class is a private method of that class. A module exists only when it has two or more consumers. One factory per concern, not one per port.
- No production code whose only purpose is to serve a test.
- In `apps/platform`, import app-local modules through the app-root alias `~/`. Use package scripts or exposed binaries, never deep `node_modules` paths
- Tailwind-first UI. Prefer primitives and semantic tokens over raw colors, arbitrary typography, or repeated spacing, radius, and shadow values; arbitrary values only for non-reusable layout mechanics. Build conditional classes with `cn` object entries, not template interpolation or nested ternaries.

## Data and SQL

- Database state is reproducible from migrations (`pnpm db:generate`, `pnpm db:migrate`), the reference rows in `apps/platform/db/seeds/` that `pnpm db:migrate` applies after them, and application code. Never depend on manual schema edits or one-off data mutations. Migrations get no tests; applying one is its verification.
- Bind every dynamic SQL value through ORM or tagged-template parameters; allowlist dynamic identifiers.
- SQL does persistence, filtering, joins, ordering, constraints, and necessary aggregation. Map rows into API and domain shapes in TypeScript unless a documented performance, atomicity, or database-native need says otherwise.
- Query every table through Drizzle's core query builder, never `db.query.*`. Tables live in a component's `adapters/outbound/persistence/schema.server.ts`; `apps/platform/db/drizzle.config.ts` finds them. `apps/platform/db/` holds the drizzle config, migrations, seeds, bootstrap SQL and local scripts.
- A component's schema may import another component's schema only for a foreign key (consumer → provider), and only the owning component's persistence adapters write a table. Declare foreign keys in the schema; hand-write migration SQL only for what Drizzle cannot declare.

## Tests

- Every `pnpm test` run typechecks first and refuses to start Vitest if it fails.
- Co-locate tests with code, organized by product concept. Every scenario has ordered `// arrange`, `// act`, `// assert` sections. Prefer `userEvent`; use `fireEvent` only for unsupported interactions.
- Backend unit and integration tests live in separate files. Unit tests mock dependencies. Integration tests mock nothing: a suite extends `apps/platform/integration-test-config/`, starts real containers (Postgres, third parties behind WireMock honoring their real contract), spawns the production build as its own process, and drives an entry point over HTTP through `suite.request`. Assert the response and the side effects that reached the database or provider. A page is asserted by status and copy, not loader output.
- Never construct a repository, service, or controller inside an integration test, never stand in for an internal collaborator, and never call below the entry point. Behavior unreachable from an entry point belongs in a unit test. The harness itself is not integration-tested. A repository is a Postgres adapter implementing a domain port.
- Wall-clock time is a named input: a `ClockPort` port in domain code, `vi.useFakeTimers({ toFake: ["Date"] })` only where code still reads `Date` directly, `await suite.setServerClock(instant)` in integration suites. Only `Date` is controlled. Never arrange time by rewriting rows the application recorded.
- Frontend unit and UI integration tests live in separate files; UI integration filenames include `ui-integration` and render real components. Frontend API traffic goes through the public request path and MSW. Never stub `fetch`, mock API hooks, or bypass routes.
- Assert roles, copy, state changes, routes, statuses, redirects, persistence, and public outcomes, never private helpers, logs, or implementation details. Class assertions only on reusable UI primitives whose classes are part of their contract.

## Public UI and Accessibility

- Public routes are server-rendered at request time; load database-backed state through loaders, not client-side round trips.
- Third-party verification stays behind adapters; the server verifies provider tokens before domain logic runs.
- One `<h1>` per page with non-skipping heading levels; labeled `main`, `nav`, and `aside` landmarks; native semantics first, with ARIA only for what HTML cannot express; every interaction keyboard-operable; a layout-stable `prefers-reduced-motion` fallback for every animation.

## QA Testing

If a QA agent performs manual testing on the application using playwright scripts. Then the QA agent must first inspect our e2e testing suite and configuration to understand the current shape, and integrate it's scripts cleanly into our e2e suite.
