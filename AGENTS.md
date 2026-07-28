# Agent Instructions

Behavioral overlay for any agent working in this repo. Architectural and design rules live in dedicated docs; this file points to them and adds the rules and workflow that are specific to working *as an agent* here.

## Companion Docs

- `ARCHITECTURE.md` — internal boundaries, layering (routes vs domain vs infra), PWA scope, deployment model. Treat as binding.
- `DESIGN.md` — visual identity, color tokens, accessibility targets, mobile patterns. Synchronized pair with `designs/react-reference-app/DESIGN.md`; update both in the same diff.
- `PRD.md` — product requirements and domain language. Use the same vocabulary in code, tests, fixtures, and UI state names. When the PRD renames a concept, rename the app vocabulary instead of adding parallel synonyms.
- `README.md` — local setup walkthrough and Linear project link.


## React Design Reference App (`designs/react-reference-app/`)

This app maintains a companion prototype React referene app.

## Setup

Package manager: **pnpm 10.33.0**. Node version differs by directory:

- Repo root and `apps/platform`: Node `>=24.14.1 <25` (see `package.json` engines).
- `designs/react-reference-app`: Node 20.19+ or 22.12+ (see its `.nvmrc`). Run `nvm use` inside that directory before installing — Vite 6 will refuse a stale default Node.

First-time local setup:

```bash
pnpm install
pnpm secrets:local:prepare   # creates gitignored .env and .env.postgres
pnpm db:bootstrap:local      # bring up local Postgres + run migrations
```

Run the stack:

```bash
pnpm dev:all        # platform app + local Postgres + reference app
pnpm dev:platform   # platform app only
```

Local Postgres binds to `127.0.0.1:55437`. Override with `LOCAL_POSTGRES_PORT=...`; also set `LOCAL_POSTGRES_CONTAINER_NAME=...` if another branch is using the same container name.

## Updating Terms

Edit `packages/content/src/website-and-store-terms/current.ts`, change the version, effective date, and wording, then run `pnpm terms:pdf`. Review `/terms` and the new PDF, run the normal checks, and commit the source and PDF together. Never overwrite an older Terms PDF.

## Validate Before Claiming Done

Run all of these before declaring a task complete or opening a PR:

```bash
pnpm lint           # ESLint incl. eslint-plugin-jsx-a11y
pnpm typecheck      # workspace-wide
pnpm test           # Vitest (unit + ui-integration)
pnpm test:a11y      # vitest-axe scans for layout components
pnpm test:lighthouse # marketing-page Lighthouse CI (slower; run before PR)
```

Don't claim a UI change works without exercising it in a browser. Type checks and unit tests verify code correctness, not feature correctness — say so explicitly when you can't run the UI.

## Project Tracking

All work tracks to the [Linear — Eli Coach Platform](https://linear.app/general-hub/project/eli-coach-platform-ab5fc387cfba) project. Reference the issue ID in every commit (e.g. `GEN-123 …`). Epics carry the **Epic** label; user stories are sub-issues of their parent epic.

Brainstorm and planning artifacts under `docs/superpowers/` (specs, plans, progress ledgers) are gitignored — treat them as local working artifacts. Don't try to commit them or expect them in a PR diff.

## Source of Truth Before Implementing

Before implementing from a PRD, prototype, ticket, or recently merged branch, verify what's actually current:

- Fetch from `origin/main` and inspect the exact commit/file referenced.
- Restart stale preview processes before judging behavior or copy.
- Don't rely on screenshots, memory, or a stale dev server.

## Code Style

- No comments unless the *why* is non-obvious. The code should explain *what*.
- Functions take ≤3 parameters; group beyond that into an options object.
- No boolean arguments — split into two named functions instead.
  ```ts
  // Bad
  function fetchUser(id, includeDeleted) { ... }
  // Good
  function fetchUser(id) { ... }
  function fetchUserIncludingDeleted(id) { ... }
  ```
- Prefer composition over inheritance, flat over nested, explicit over clever.
- Inside `apps/platform`, app-local modules use the app root alias rather than deep relative paths.
- For conditional Tailwind classes, use `cn` with object entries keyed by the boolean condition. Avoid template-literal class strings and nested ternaries for styling state.
- Keep Tailwind utility strings semantic and non-redundant. For repeated feature-specific text colors or borders, prefer a local component role class when it makes the class list clearer; be especially careful not to combine custom typography tokens such as `text-label` with custom `text-*` color utilities inside `cn`, because `tailwind-merge` can drop one.
- Do not turn infrastructure failures into domain statuses. If a repository, feature flag, or other dependency fails unexpectedly, either handle it as an explicit degraded state for that feature or let it surface as an application error; never return a business status like "already registered" or "capacity reached" to paper over an unknown failure.

## Testing

Test files live next to the code they exercise. Naming and split rules:

- **Backend tests** (anywhere under `apps/platform/app/**/*.server.*`, `packages/domain`, `packages/db`, `packages/auth`, `packages/contracts`): keep unit and integration coverage in **separate files**. Unit tests mock dependencies; integration tests exercise the full app boundary against real infra via testcontainers.
- **Frontend tests** (`packages/ui`, `apps/platform/app/routes/**`, `apps/platform/app/components/**`): keep isolated unit tests and UI integration tests in **separate files**.
  - UI integration filename **must** include `ui-integration` (example: `apps/platform/app/routes/marketing/hero/hero.ui-integration.test.tsx`).
  - UI integration tests must render real components (no module mocking of components).
  - Frontend tests that cross an API boundary **must** mock the request with **MSW** every time. Do not stub `fetch`, mock API hooks, or bypass the route action/query path to fake API behavior. Route loader/context fixtures may seed static shell data, but user-triggered API traffic and runtime refetches must go through the app's public request path and be intercepted by MSW.
- Integration tests must stay black-box at the app boundary: assert public responses, persisted state, and externally visible behavior. Do not spy on logs, private helpers, or implementation-detail side effects in integration tests; keep those assertions in unit tests.
- Do not assert implementation-only class names in feature tests. Prefer visible behavior, roles, copy, and user-observable state; reserve class assertions for reusable UI primitives whose class output is the API under test.
- Group test files by product concept (`layout/`, `waitlist/`, `hero/`), not by generic technical buckets.
- Every test scenario must use explicit `// arrange`, `// act`, and `// assert` comments to delimit the scenario phases. Keep the flow in that order, and don't interleave assertions and interactions in ways that obscure the behavior under test.
- Prefer `@testing-library/user-event` over `fireEvent`. Use `fireEvent` only for events `userEvent` doesn't model.

## Marketing Surface Rules

Public prerendered routes (under `/`, excluding `/client`, `/coach`, `/api`) must be **static shells**. Any live state requiring database access (e.g. waitlist counters) loads at runtime via the API boundary, never at render time. Third-party verification (e.g. bot detection) stays behind explicit adapters: the browser may collect a provider token, but the server must verify before any domain use case runs.

Production UI is Tailwind-first. Before adding raw or ad-hoc values, check for an existing primitive or semantic token. Avoid raw prototype colors (`bg-[#...]`, hex/rgb, raw `neutral-*`), ad-hoc typography (`text-[14px]`, one-off tracking/leading the scale already covers), and one-off spacing/sizing/radius/shadow that duplicates a token. Component geometry and scroll/layout mechanics may use arbitrary utilities when no token fits and the value isn't a reusable decision; promote a token only when it repeats or carries design-system meaning.

Local scripts should call package-manager scripts or exposed package binaries instead of deep `node_modules` implementation paths. Keep local-only environment loading in explicit local scripts and use the repo's `.env` conventions rather than requiring manual shell setup.

## Database & Migrations

Local and test database state must be reproducible from migrations and app code alone. Never rely on manual schema edits or one-off local DB mutations to make a feature work. Use `pnpm db:generate` to add a migration, `pnpm db:migrate` to apply.

## Accessibility

Global semantic HTML rules apply here. Repo-specific targets and primitives are defined in `DESIGN.md`. Non-negotiable behaviors for any change:

- Every page renders exactly one `<h1>`; heading levels progress without skipping.
- Layouts expose semantic landmark regions: a labeled main, labeled `<nav>` for every navigation landmark, and a labeled `<aside>` for every sidebar/complementary panel.
- Reach for native elements first; add ARIA only when native semantics don't cover the interaction.
- Every interactive element is fully keyboard operable.
- Animations and transitions ship with a `prefers-reduced-motion` fallback that preserves usability without layout shift.
