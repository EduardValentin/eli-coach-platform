# Agent Instructions

Repository operating rules. `ARCHITECTURE.md`, `DESIGN.md`, and `PRD.md` are binding companions. `README.md` owns setup and commands.

## Prototype-Backed Application

This production app is backed by a reference prototype in `designs/react-reference-app`: a React single-page app with mocked backend, auth, email, and payments, and a global Dev Toggle for switching app states. The prototype is the source of truth for flows, design, domain objects, and business rules. Production must not contain features or design absent from the prototype; the prototype may run ahead of production.

- Before any work that adds or changes user-visible UI, in production or in the prototype, load the `prototype-backed-workflow` skill and follow it, including its parity gate before a PR.
- Parity artifacts live only under the gitignored `.parity/` root and are never committed. `DESIGN.md` records current state, never parity or history.
- The prototype sits outside the pnpm workspace: npm on the same Node version, verified by its own `npm test` and `npm run build`.

## Sources of Truth

- `ARCHITECTURE.md`: where a file goes and what it may import.
- `DESIGN.md`: visual identity and where the design system lives.
- `PRD.md`: product behavior, business rules, and canonical vocabulary. Rename vocabulary when the PRD changes; never create synonyms.
- Boundary rules R1–R7: `eslint.config.mjs` and `tools/lint-boundaries.test.mjs`.

Before implementing from a ticket, prototype, PRD, or branch: fetch `origin/main`, inspect the referenced commit or file, and restart stale previews. Never rely on memory, screenshots, or stale servers.

## Project Stage

Pre-launch MVP with no users and no production environment.

- Write nothing whose only purpose is to protect existing data, users, or a previous implementation.
- Prefer the simplest change over the compatible one. No compatibility shims, dual-write paths, backfills, or staged rollouts.
- LOCAL and TEST databases may be dropped and recreated at will.
- Revisit this section before the first production deployment.

## Delivery

- Track work in the Linear Eli Coach Platform project. Prefix every commit with the issue ID (`GEN-123 …`). Ad hoc work without an issue omits the prefix; ask before assuming work is ad hoc.
- Keep `docs/superpowers/` artifacts local and uncommitted unless asked.
- Re-read a Dependabot PR's current title and diff before merging; a rebase can retarget a minor to a major.
- Terms changes follow `docs/TERMS.md`. Store products are published only through the management API, per `docs/STORE_PUBLISHING.md`.

Before claiming completion or opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:lighthouse
```

Exercise UI changes in a browser. If browser verification is unavailable, say so; tests and typechecks do not prove UI behavior.

## Code

- Comments explain non-obvious reasons, not what the code does.
- At most three parameters per function; an options object beyond that. No boolean parameters: expose separate named operations.
- Prefer composition, flat control flow, explicit behavior, and purpose-revealing names.
- No production code whose only purpose is to serve a test. A seam is legitimate when it stands for a real input from outside the process (database, provider, randomness, wall-clock time) and illegitimate when it lets a test reach inside behavior. Ask whether the seam would survive the tests being deleted.
- In `apps/platform`, import app-local modules through the app-root alias. Use package scripts or exposed binaries, never deep `node_modules` paths.
- Build every redirect target handed to middleware or an SDK prop through `buildRedirectPath` from `@eli-coach-platform/config`; only loader and action redirects are basename-normalized by the framework.
- Tailwind-first UI. Prefer primitives and semantic tokens over raw colors, arbitrary typography, or repeated spacing, radius, and shadow values; arbitrary values only for non-reusable layout mechanics. Build conditional classes with `cn` object entries, not template interpolation or nested ternaries.

## Data and SQL

- Database state is reproducible from migrations (`pnpm db:generate`, `pnpm db:migrate`) and application code. Never depend on manual schema edits or one-off data mutations. Migrations get no tests; applying one is its verification.
- Bind every dynamic SQL value through ORM or tagged-template parameters; allowlist dynamic identifiers.
- SQL does persistence, filtering, joins, ordering, constraints, and necessary aggregation. Map rows into API and domain shapes in TypeScript unless a documented performance, atomicity, or database-native need says otherwise.
- Query every table through Drizzle's core query builder, never `db.query.*`. Tables live in a feature's `data/schema.server.ts` or a package's own `*schema*.server.ts`; `apps/platform/db/drizzle.config.ts` finds them.

## Tests

- Every vitest run typechecks first and refuses to run if it fails.
- Co-locate tests with code, organized by product concept. Every scenario has ordered `// arrange`, `// act`, `// assert` sections. Prefer `userEvent`; use `fireEvent` only for unsupported interactions.
- Backend unit and integration tests live in separate files. Unit tests mock dependencies. Integration tests mock nothing: a suite extends `apps/platform/integration-test-config/`, starts real containers (Postgres, third parties behind WireMock honoring their real contract), spawns the production build as its own process, and drives an entry point over HTTP through `suite.request`. Assert the response and the side effects that reached the database or provider. A page is asserted by status and copy, not loader output.
- Never construct a repository, service, or controller inside an integration test, never stand in for an internal collaborator, and never call below the entry point. Behavior unreachable from an entry point belongs in a unit test. The harness itself is not integration-tested.
- Wall-clock time is a named input: `vi.useFakeTimers({ toFake: ["Date"] })` in unit tests, `await suite.setServerClock(instant)` in integration suites. Only `Date` is controlled. Never arrange time by rewriting rows the application recorded.
- Frontend unit and UI integration tests live in separate files; UI integration filenames include `ui-integration` and render real components. Frontend API traffic goes through the public request path and MSW. Never stub `fetch`, mock API hooks, or bypass routes.
- Assert roles, copy, state changes, routes, statuses, redirects, persistence, and public outcomes, never private helpers, logs, or implementation details. Class assertions only on reusable UI primitives whose classes are part of their contract.

## Public UI and Accessibility

- Public routes are server-rendered at request time; load database-backed state through loaders, not client-side round trips.
- Third-party verification stays behind adapters; the server verifies provider tokens before domain logic runs.
- One `<h1>` per page with non-skipping heading levels; labeled `main`, `nav`, and `aside` landmarks; native semantics first, with ARIA only for what HTML cannot express; every interaction keyboard-operable; a layout-stable `prefers-reduced-motion` fallback for every animation.
