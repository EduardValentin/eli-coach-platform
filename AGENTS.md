# Agent Instructions

Behavioral overlay for any agent working in this repo. Architectural and design rules live in dedicated docs; this file points to them and adds the rules and workflow that are specific to working *as an agent* here.

## Companion Docs

- `ARCHITECTURE.md` — internal boundaries, layering (routes vs domain vs infra), PWA scope, deployment model. Treat as binding.
- `DESIGN.md` — visual identity, color tokens, accessibility targets, mobile patterns. Synchronized pair with `designs/react-reference-app/DESIGN.md`; update both in the same diff.
- `PRD.md` — product requirements and domain language. Use the same vocabulary in code, tests, fixtures, and UI state names. When the PRD renames a concept, rename the app vocabulary instead of adding parallel synonyms.
- `README.md` — local setup walkthrough and Linear project link.

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

## Source of Truth Before Implementing

Before implementing from a PRD, prototype, ticket, or recently merged branch, verify what's actually current:

- Fetch from `origin/main` and inspect the exact commit/file referenced.
- Restart stale preview processes before judging behavior or copy.
- Don't rely on screenshots, memory, or a stale dev server.

## Code Style

Universal style is enforced by lint/typecheck. Repo-specific rules:

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
- Avoid IDs and `aria-labelledby` for structural labelling when native HTML structure is enough. Use IDs only when they have a concrete accessibility or platform purpose, such as form labels, `aria-describedby`, or a component relationship that cannot be expressed otherwise.
- Do not turn infrastructure failures into domain statuses. If a repository, feature flag, or other dependency fails unexpectedly, either handle it as an explicit degraded state for that feature or let it surface as an application error; never return a business status like "already registered" or "capacity reached" to paper over an unknown failure.

## Testing

Test files live next to the code they exercise. Naming and split rules:

- **Backend tests** (anywhere under `apps/platform/app/**/*.server.*`, `packages/domain`, `packages/db`, `packages/auth`, `packages/contracts`): keep unit and integration coverage in **separate files**. Unit tests mock dependencies; integration tests exercise the full app boundary against real infra via testcontainers.
- **Frontend tests** (`packages/ui`, `apps/platform/app/routes/**`, `apps/platform/app/components/**`): keep isolated unit tests and UI integration tests in **separate files**.
  - UI integration filename **must** include `ui-integration` (example: `apps/platform/app/routes/marketing/hero/hero.ui-integration.test.tsx`).
  - UI integration tests must render real components (no module mocking of components).
  - Mock API boundaries with **MSW**, not by stubbing hooks or fetch. Route loader/context fixtures may seed the static shell, but user-triggered API traffic should still go through the route action/fetch path and be intercepted by MSW.
- Integration tests must stay black-box at the app boundary: assert public responses, persisted state, and externally visible behavior. Do not spy on logs, private helpers, or implementation-detail side effects in integration tests; keep those assertions in unit tests.
- Group test files by product concept (`layout/`, `waitlist/`, `hero/`), not by generic technical buckets.
- Arrange / act / assert flow. Don't interleave assertions and interactions in ways that obscure the behavior under test.
- Prefer `@testing-library/user-event` over `fireEvent`. Use `fireEvent` only for events `userEvent` doesn't model.

## Frontend Runtime Data

Live API state in the production app uses **TanStack Query** (`apps/platform/app/query-client.tsx`; see `apps/platform/app/routes/marketing/waitlist/waitlist-query.ts` for a concrete pattern). Do not scatter ad-hoc `fetch` calls through components. Loading, error, retry, and invalidation behavior must be explicit and consistent for the surface using it.

## Marketing Surface Rules

Public prerendered routes (under `/`, excluding `/client`, `/coach`, `/api`) must be **static shells**. Any live state requiring database access (e.g. waitlist counters) loads at runtime via the API boundary, never at render time. Third-party verification (e.g. bot detection) stays behind explicit adapters: the browser may collect a provider token, but the server must verify before any domain use case runs.

Production UI should consume shared UI primitives and semantic design tokens before adding page-local Tailwind. Do not copy raw prototype values such as `bg-[#...]`, arbitrary label sizes, ad hoc letter spacing, raw `neutral-*` colors, or one-off dimensions into production. If the reference app uses one-off styling, translate it into the production design system or document the token gap before implementing.

Local scripts should call package-manager scripts or exposed package binaries instead of deep `node_modules` implementation paths. Keep local-only environment loading in explicit local scripts and use the repo's `.env` conventions rather than requiring manual shell setup.

## Database & Migrations

Local and test database state must be reproducible from migrations and app code alone. Never rely on manual schema edits or one-off local DB mutations to make a feature work. Use `pnpm db:generate` to add a migration, `pnpm db:migrate` to apply.

## Accessibility

Targets and primitives are defined in `DESIGN.md`. Non-negotiable behaviors for any change:

- Every page renders exactly one `<h1>`; heading levels progress without skipping.
- Layouts expose semantic landmark regions: a labeled main, labeled `<nav>` for every navigation landmark, and a labeled `<aside>` for every sidebar/complementary panel.
- Reach for native elements first; add ARIA only when native semantics don't cover the interaction.
- Every interactive element is fully keyboard operable.
- Animations and transitions ship with a `prefers-reduced-motion` fallback that preserves usability without layout shift.

## React Design Reference App (`designs/react-reference-app/`)

This is a TEST-only design reference, not part of the production runtime. Use it as the visual/interaction source of truth when a ticket says so.

### When you're working in a worktree

Worktrees can be deleted (manually or by tooling) and uncommitted edits do not survive. Commit each meaningful checkpoint to the worktree's branch. Always edit files **inside the worktree path** — the dev server runs against the worktree, so writes elsewhere won't show up in preview.

A fresh worktree has no `node_modules`. Install before the first run:

```bash
cd designs/react-reference-app && nvm use && npm install
```

In Claude Code, start the preview through `preview_start` (uses `.claude/launch.json`, which sources `nvm`, honors `.nvmrc`, installs if missing, then launches Vite). In other agent harnesses, start Vite via the reference app's npm scripts from inside the worktree — never run Vite from the main checkout.

### Reference-app code style

- Tailwind only. No inline `style={{ ... }}`, no CSS-in-JS, no `.css`/`.scss` modules, no global stylesheets beyond the existing Tailwind entry.
- Style through semantic design tokens (`bg-surface`, `text-foreground`, `border-border`). Never hardcode raw values (`bg-[#fff]`, `text-[14px]`).
- If a token is missing, extend the design system: add a *semantic* token (named for its role, not its appearance), document it in both `DESIGN.md` files in the same diff, then consume it. Don't add one-off utilities at the component layer.
- The production app design system is the source of truth. When the reference app deviates, treat it as a gap to close in production through deliberate token design — not by lowering production's bar.
- Custom hooks for logic, composition for UI, controlled components for forms.
- Co-locate sub-components in the same file when only used by the parent; promote to their own file once reused.

### Reference-app navigation

- **Never** use `window.location.href`/`assign()`/`replace()` or any direct browser navigation. Full reloads destroy in-memory state including the Dev Toggle (which simulates roles, auth states, and feature flags).
- Use React Router: `useNavigate()`, `<Link>`, `<Navigate>`.
- `<a>` is only for links that leave the app entirely (external sites, social profiles). Always include `target="_blank"` and `rel="noopener noreferrer"`.

### Mock data separation

Mock data, fake API calls, and simulated flows live in dedicated files (context providers, data files, mock service modules). Components receive data via props/context and never know whether it's real or mocked. No inline mock-state construction in components.

## Prototype Parity

When a ticket points at the reference app as the spec, parity covers: copy, spacing, visual styling, animation timing, reduced-motion behavior, loading states, submit feedback, toast/no-toast decisions, cursor affordances, and error presentation. After meaningful UI changes, compare production and reference side by side in a browser before calling the work done.

## Code Review Follow-Up

Treat review comments as work items needing either a code change or a concrete written answer. Fix what's valid, explain what is intentionally not addressed, and push back on anything that conflicts with product requirements or doesn't make sense technically.
