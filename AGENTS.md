# Agent Instructions

## Global Rules

### Code Quality

- No unnecessary comments. The code should be self-explanatory. Only add comments where the logic is genuinely non-obvious.
- Enforce the Single Responsibility Principle at all levels: functions do one thing, components render one concern, modules own one domain.
- Reduce duplication by organizing shared logic into utility functions and shared components. If the same pattern appears more than twice, extract it.
- Use meaningful, readable variable and function names. A name should describe what it holds or does without needing a comment beside it.

### Function Design

- Functions must not accept more than 3 parameters. If more are needed, group related parameters into an options object.
- Never use boolean arguments. A boolean argument means the function does two different things depending on a flag — split it into two functions with descriptive names instead.

  ```
  // Bad
  function fetchUser(id, includeDeleted) { ... }

  // Good
  function fetchUser(id) { ... }
  function fetchUserIncludingDeleted(id) { ... }
  ```

### Patterns

- Follow well-known, established patterns for the language and framework in use. Do not invent custom conventions when a standard one exists.
- Prefer composition over inheritance. Prefer flat over nested. Prefer explicit over clever.
- The repo-root `DESIGN.md` and `designs/react-reference-app/DESIGN.md` are a synchronized pair. Keep them identical and update both files together in the same diff so they never drift.
- Before implementing from a PRD, prototype, or recently merged branch, verify the current source of truth first. Fetch/update from `origin/main` when relevant, inspect the exact commit or file being referenced, and restart stale preview processes before judging behavior or copy.
- Use the same domain language as the PRD and product discussion in code, tests, fixtures, and UI state names. When language changes, rename the app vocabulary instead of adding parallel synonyms.

### Testing

- Structure tests with a clear arrange, act, assert flow. Do not interleave assertions and interactions in a way that obscures the behavior under test.
- Prefer `@testing-library/user-event` for UI interactions because it better reflects real user behavior. Use `fireEvent` only for low-level events that `userEvent` does not model clearly.
- Backend tests must keep unit and integration coverage in separate files. Unit tests mock dependencies; integration tests exercise the full app boundary with external services through test containers or equivalent real test infrastructure.
- Frontend tests must keep isolated unit tests and UI integration tests in separate files. UI integration test filenames must include `ui-integration`, must integrate real components, and must use MSW for API boundaries instead of mocking component imports.
- Group test files by product concept or concern, such as `layout` and `waitlist`, rather than by generic technical buckets when a clearer domain grouping exists.

### Accessibility

- Layouts must expose semantic landmark regions. Every surface needs a main content landmark, every navigation landmark must have a meaningful label, and every sidebar or complementary panel must use a labeled `<aside>`.
- Every page must render exactly one `h1`, and heading levels must progress without skipping.
- Use semantic HTML before ARIA. Reach for native elements first and add ARIA only when native semantics do not cover the interaction.
- Every interactive element must be fully keyboard operable.
- Do not ship animations or transitions without a reduced-motion fallback that preserves usability and avoids layout shifts.

## Project Tracking

All work is tracked in the [Linear — Eli Coach Platform](https://linear.app/general-hub/project/eli-coach-platform-ab5fc387cfba) project under the **General Hub** team.

- **Epics** are Linear issues with the **Epic** label. They represent feature areas.
- **User stories** are sub-issues of their parent epic.
- When implementing a ticket, reference its Linear issue ID in the commit message (e.g., `GEN-123`).

## Production App Architecture

The production product is a single full-stack React Router app under `apps/platform`.

This is an intentional modular monolith. One deployable does not mean one undifferentiated codebase.

### Internal Boundaries

- Treat the public site, client portal, and coach portal as separate product surfaces inside the same app.
- Keep route modules thin. Routes orchestrate requests, compose domain services, and render UI. They do not own business rules.
- Put business logic in `packages/domain` and in domain-focused modules under `apps/platform/app` when a concern is app-local.
- Keep infrastructure adapters in `packages/*` or dedicated service modules. Route files and UI components should not talk directly to third-party SDKs.
- Keep server-only logic separate from shared logic and browser-only logic. Do not import server-only code into browser-rendered components.
- Do not import code from one route tree into another route tree. Shared logic belongs in domain packages, shared UI packages, or dedicated helpers.

### Surface Separation

- Public routes own marketing, blog, store, and SEO-facing flows.
- Client routes own client-facing flows only.
- Coach routes own coach-facing flows only.
- Shared UI primitives go in `packages/ui`.
- Shared configuration, auth helpers, contracts, and domain utilities go in workspace packages.

### Auth and Permissions

- Centralize authentication helpers and authorization checks.
- Role checks should live in explicit helpers such as `requireCoachUser`, `requireClientUser`, or domain permission functions.
- Do not scatter inline role checks across route components and loaders.

### Data and Domain Rules

- Model domain capabilities by business area, not by page.
- Each domain area should own its validation, types, use cases, and data access abstractions.
- Database access should flow through domain services or repositories, not ad hoc SQL scattered through routes.
- Design server-side domain calls as stable internal contracts so they can become a separate API later without rewriting the calling code.
- Local and test database state must be reproducible from migrations and app code. Do not rely on manual schema edits or one-off local database mutations to make a feature work.
- Public prerendered marketing pages must be static shells. Any live state that needs database access, such as waitlist counters, must load at runtime through an API or equivalent runtime boundary.
- Third-party verification concerns, such as bot detection, must stay behind explicit adapters. The browser may collect a provider token, but the server must verify it before domain use cases run.

### Frontend Runtime Data

- Use the established runtime data-fetching layer for live API state instead of scattering ad hoc `fetch` calls through components.
- Loading states, error states, retries, and cache invalidation should be explicit and consistent with the product surface using them.

### PWA Boundaries

- The app may expose separate installable experiences for `/client` and `/coach`.
- Keep client and coach manifests, install prompts, and service worker registration scoped to their own route trees.
- Do not let public routes accidentally inherit client or coach PWA behavior.

## React Design Reference App (`designs/react-reference-app/`)

### Fresh Worktree Setup

A git worktree starts with no `node_modules`, so anything that runs the reference app must install dependencies first. Equally important: every meaningful change should be committed on the worktree's branch as you go — if the worktree is removed before commits land, the work is gone with it.

- **Commit frequently.** Worktrees can be deleted (manually or by tooling) and uncommitted edits do not survive. Commit each meaningful checkpoint to the worktree's branch so progress is preserved on the ref even if the directory is removed.
- **Node version** is pinned in `designs/react-reference-app/.nvmrc`. If you use `nvm`, run `nvm use` inside that directory before installing. Vite 6 requires Node 20.19+ or 22.12+, so a stale default Node will fail to start the dev server.
- **Install dependencies** in `designs/react-reference-app/` before the first run:
  ```
  cd designs/react-reference-app && nvm use && npm install
  ```
- **Starting the preview**: `.claude/launch.json` defines the `design-reference` server. It already sources `nvm`, honors `.nvmrc`, runs `npm install` when `node_modules` is missing, and launches Vite. Invoke it through the preview tooling (`preview_start`) rather than running Vite by hand, so the same launch path is used every time.
- **Worktree writes**: always edit files inside the worktree path. Do not write into the main checkout — the dev server runs against the worktree, so writes elsewhere will not show up in preview.

### Code Style

- Write clean, idiomatic React. Follow well-known React patterns such as custom hooks for logic, composition for UI, and controlled components for forms.
- When a component grows too large, break it into smaller focused components. A component that requires scrolling to understand is too big.
- Co-locate extracted sub-components in the same file if they are only used by the parent. Move them to their own file only when reused elsewhere.

### Styling

- Tailwind is the only allowed styling mechanism in the React reference app. No inline `style={{ ... }}` props, no CSS-in-JS (styled-components, emotion, vanilla-extract, etc.), no `.css`/`.scss` modules, and no global stylesheets beyond the existing Tailwind entry point.
- Always style through semantic design tokens defined in the design system (e.g. `bg-surface`, `text-foreground`, `border-border`). Never hardcode raw colors, spacing, or typography values (e.g. `bg-[#fff]`, `text-[14px]`) in component code.
- If a design requirement cannot be expressed with the existing tokens, extend the design system carefully: add a new semantic token (not a one-off utility) at the design system layer, document it in `DESIGN.md` (both copies — see Patterns), and only then consume it from components. Update both `DESIGN.md` files in the same diff so they stay in sync.
- Prefer composing existing tokens and primitives over introducing new ones. New tokens must have a clear semantic meaning (what role they play in the UI), not a literal one (what they look like).
- Mismatches between the production app design system and the reference app design system are expected, but the production app design system is the source of truth and must hold to the highest standard for a semantic-token-based system. When the reference app deviates, treat it as a gap to close in the production system through deliberate token design — not by lowering the production bar to match.

### Navigation

- Never use `window.location.href`, `window.location.assign()`, `window.location.replace()`, or any other direct browser navigation. These cause a full page reload and destroy all in-memory app state, including Dev Toggle settings.
- Always use React Router navigation: `useNavigate()`, `<Link>`, or `<Navigate>`. These preserve app state across route changes.
- The app uses a Dev Toggle widget that sets in-memory state to simulate different user roles, auth states, and feature flags. Any full-page reload loses this state and breaks the testing flow.

### No Raw Anchor Tags

- Never use `<a>` tags for in-app navigation. Always use React Router's `<Link>` component instead. Raw anchors cause full page reloads and destroy app state.
- The only acceptable use of `<a>` is for links that navigate away from the app entirely (e.g., external websites, social media profiles). In that case, always include `target="_blank"` and `rel="noopener noreferrer"`.

### Mock Data Separation

- Mock data, fake API calls, and simulated flows must be completely separate from component rendering logic.
- Components receive data through props or context — they never know whether the data is real or mocked.
- Keep all mock data definitions, fake delays, and state simulation logic in dedicated files such as context providers, data files, or mock service modules. Components import and consume — they never construct mock state inline.

## Prototype Parity

- When production work is driven by the React reference app, inspect the current reference code and live preview before implementing. Do not rely on screenshots, memory, or a stale dev server.
- Parity includes copy, spacing, visual styling, animation timing, reduced-motion behavior, loading states, submit feedback, toast/no-toast decisions, cursor affordances, and error presentation.
- After meaningful UI changes, compare the production app and the reference app in the browser for both visual appearance and behavior before calling the work complete.

## Code Review Follow-Up

- Treat review comments as work items that need either a code change or a concrete written answer.
- Fix what is valid, explain what is intentionally not addressed, and call out anything that does not make sense technically or conflicts with product requirements.
