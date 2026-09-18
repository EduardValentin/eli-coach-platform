# Metrics

Header: date 2026-09-18, commit 7c156e6f, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,test-support,ui}/src plus the enforcement layer (tools/dependency-cruiser.config.cjs, tools/dependency-cruiser.tsconfig.json, tools/boundaries.test.mjs, tools/boundary-fixtures/, tools/domain-layout.mjs, tools/domain-layout.test.mjs, tools/domain-layout-fixtures/, knip.json, eslint.config.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode record update for GEN-191 over `843d8261..7c156e6f` on top of change review run 8 at e8690f45. Definitions and reading guide: the inspection workflow's metrics reference. Computed because the graph has sixteen components.

Counting: fan-in is the number of modules outside the component that import at least one module inside it; fan-out is the number of modules inside that import at least one module in another in-scope component (externals excluded). Abstract types are port interfaces that exist only to be implemented; total types are exported classes, interfaces, and type aliases. Previous distance is the run-8 value at e8690f45. Generated from a cold cruise of the import graph at 7c156e6f: 357 modules, 928 dependencies, 0 violations, 0 circular, over 334 in-scope production modules; the per-module edge table is in `dependencies.md`.

**What this update recounted.** Fan-in, fan-out, instability, abstractness and distance are recomputed from the cruise above, so every number in those five columns is current. The two volatility columns are not: their window is still run 8's `148d594f..e8690f45`, and the GEN-191 column beside them counts the seven commits in `843d8261..7c156e6f` (one of them prototype-only, so it touches no component here) rather than extending the window. A single feature's window is too short to read as volatility; the next full architecture review owns the recount.

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility (run-8 window) | of which run 8 | GEN-191 commits |
|---|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 61 | 0 | 0.00 | 0.23 (24 / 106) | 0.77 | 0.77 | 25 | 12 | 2 |
| C2 packages/db | 19 | 0 | 0.00 | 0.00 (0 / 1) | 1.00 | 1.00 | 0 | 0 | 0 |
| C3 packages/config | 28 | 0 | 0.00 | 0.00 (0 / 13) | 1.00 | 1.00 | 5 | 0 | 1 |
| C4 packages/content | 9 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 | 0 |
| C5 packages/ui | 37 | 0 | 0.00 | 0.00 (0 / 4) | 1.00 | 1.00 | 3 | 0 | 3 |
| C6 packages/infrastructure | 43 | 13 | 0.23 | 0.00 (0 / 14) | 0.77 | 0.72 | 10 | 1 | 1 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 | 6 | 0 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 12) | 0.42 | 0.42 | 16 | 1 | 0 |
| C9 features/accounts | 15 | 15 | 0.50 | 0.00 (0 / 10) | 0.50 | 0.50 | 11 | 1 | 0 |
| C11 surfaces/public-site | 1 | 22 | 0.96 | 0.00 (0 / 11) | 0.04 | 0.04 | 12 | 1 | 2 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 | 0 |
| C13 surfaces/coach-portal | 1 | 5 | 0.83 | undefined (0 types) | 0.17 | 0.17 | 3 | 0 | 0 |
| C14 apps/platform/src/server | 3 | 11 | 0.79 | 0.00 (0 / 14) | 0.21 | 0.21 | 11 | 1 | 1 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 | 0 | 1 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 | 0 |
| C17 features/assessment-calls | 7 | 25 | 0.78 | 0.00 (0 / 23) | 0.22 | n/a (new) | n/a | n/a | 3 |

**C10 features/coaching-bundles is gone.** The feature folder and the `packages/domain/src/coaching-bundles` slice were both deleted; the three bundle literals, the benefits list and the presenter are one C11-private module in `surfaces/public-site/sections/pricing/` (decision D5). Its three edges (`C11 → C10`, `C10 → C1`, `C10 → C5`) left the graph with it.

Mean D 0.50, standard deviation 0.37, over the fifteen components with a defined D. Run 8 read 0.51 and 0.38 over fourteen. More than one standard deviation from the mean: C2, C3, C4, C5 (D = 1.00, concrete and depended on) and C11, C15 (near zero, the intended delivery position) — the same set as run 8. C17 enters at D 0.22, inside the band and a little closer to the line than C7 and C14, the two components it most resembles. The nearest component to an edge is still C12 at D 0.14, and it stays inside. **No component was reclassified by C17 joining the set.**

One component's own D moved, by less than the 0.10 threshold. **C6 moved 0.72 → 0.77: its instability fell 0.28 → 0.23 because nine C17 modules joined its dependents (fan-in 34 → 43) while its own fan-out held at 13.** C6 is concrete by design and owns no port, so every consumer that arrives pushes it further from the balanced line; the record already carries it as a watched screen and this update does not change that reading, but it is now as far out as C1 is on the other side. Nothing about C6 changed in this window beyond one Turnstile constant and the Resend attachment mapping — the movement is entirely the new dependents.

**C1 held at 0.77.** Its abstractness held at 0.23 because the four new ports arrived alongside nineteen new published types (20 / 87 → 24 / 106), and its fan-in rose 49 → 61 without touching instability, which is zero either way. The domain absorbed a whole feature's policy without moving on the main sequence.

Every other component's D is unchanged: C17's twelve, three, three, one, five and nine edges into C1, C2, C3, C4, C5 and C6 raised only fan-in, and the components it is imported by — C11, C14, C15 — already imported something else from outside themselves, so their fan-out counts of distinct modules did not move.

In the run-8 window C1 carries the highest volatility, 12 of the 16 restructure commits and 25 of the branch's 84. Every one of the twelve is a move, a rename, or a behaviour-preserving internal refactor of the restructure itself: no domain entity, use case, port or boundary type changed in this window because a database, framework or vendor concern changed. That is one reason to change executed in twelve steps, not a component with many reasons. The position stays a watched screen for the next run, whose window is the first that can tell migration from volatility. GEN-191 is not that window: its seven commits are one feature delivered in slices, and the two that touched C1 both added the new subpaths rather than changing an existing one.

No component sits in the zone of uselessness: all 24 published abstract types in C1 have an implementer and a consumer, including the eighteen declared `export interface` and the six structural `export type` contracts (`Accounts`, `Clock`, `Logger`, `BotVerifier`, `ProductEmail`, `ManagementAuthenticator`). The four ports GEN-191 added are each implemented once in C17 and consumed by one to three use cases (B266-B269). The unpublished `DownloadTokenGenerator` also has both (`AcquireProductsUseCase` consumes it; `RandomDownloadTokenGenerator` satisfies it structurally). One method is paid for and unused: `ProductAssets.assertReady` has no production caller, because the composition calls the adapter's own `assertReadyAtStartup()` instead; it predates this change review.

Component edge counts (distinct importing modules): see `dependencies.md`, section "Component graph". Cycles detected: none, at module, component, domain-folder and UI-subpath level, over 334 in-scope production modules. In the run-8 window, two of the sixteen restructure commits touched three or more components — `2b6396bd` (C1, C6, C14: the feature-flag import repoint) and `9ef78f38` (C1, C10, C11: the bundle dissolution) — and both are uniform structural passes, not requirement changes crossing a boundary. Two of the seven GEN-191 commits also touched three or more components — `43bc46f8` (C1, C3, C6: the attachment field on the shared email port, its Resend mapping, and the new config concern) and `b2c711ef` (C5, C11, C14, C15, C17: registering the feature's routes and wiring its composition) — the first a port widening that had to land on both sides at once, the second the wiring commit a new feature needs.
