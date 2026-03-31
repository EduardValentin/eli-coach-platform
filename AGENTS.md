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

- Follow well-known, established patterns for the language and framework in use. Don't invent custom conventions when a standard one exists.
- Prefer composition over inheritance. Prefer flat over nested. Prefer explicit over clever.

---

## React Design Reference App (`designs/react-reference-app/`)

### Code Style

- Write clean, idiomatic React. Follow well-known React patterns (custom hooks for logic, composition for UI, controlled components for forms).
- When a component grows too large, break it into smaller focused components. A component that requires scrolling to understand is too big.
- Co-locate extracted sub-components in the same file if they are only used by the parent. Move them to their own file only when reused elsewhere.

### Navigation

- Never use `window.location.href`, `window.location.assign()`, `window.location.replace()`, or any other direct browser navigation. These cause a full page reload and destroy all in-memory app state, including Dev Toggle settings.
- Always use React Router navigation: `useNavigate()`, `<Link>`, or `<Navigate>`. These preserve app state across route changes.
- The app uses a Dev Toggle widget that sets in-memory state to simulate different user roles, auth states, and feature flags. Any full-page reload loses this state and breaks the testing flow.

### Mock Data Separation

- Mock data, fake API calls, and simulated flows must be completely separate from component rendering logic.
- Components receive data through props or context — they never know whether the data is real or mocked.
- Keep all mock data definitions, fake delays, and state simulation logic in dedicated files (e.g., context providers, data files, or mock service modules). Components import and consume — they never construct mock state inline.
