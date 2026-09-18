# Metrics

Header: date 2026-09-17, commit e8690f45, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,test-support,ui}/src plus the enforcement layer (tools/dependency-cruiser.config.cjs, tools/dependency-cruiser.tsconfig.json, tools/boundaries.test.mjs, tools/boundary-fixtures/, tools/domain-layout.mjs, tools/domain-layout.test.mjs, tools/domain-layout-fixtures/, knip.json, eslint.config.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode change review (run 8). Definitions and reading guide: the inspection workflow's metrics reference. Computed because the graph has fifteen components.

Change review: date 2026-09-18, commit f0eb1bf4, baseline 79fa1e95, scope the persisted waitlist-mode change (`79fa1e95..f0eb1bf4`): the changed units and their direct graph neighborhood in apps/platform, packages/{config,content,db,domain,infrastructure,ui}, tests, migrations and package deployment; partial scope, recorded under "Persisted waitlist-mode change review" below. The full-audit figures above that section stand as of e8690f45 except where that section names a change.

Counting: fan-in is the number of modules outside the component that import at least one module inside it; fan-out is the number of modules inside that import at least one module in another in-scope component (externals excluded). Abstract types are port interfaces that exist only to be implemented; total types are exported classes, interfaces, and type aliases. Volatility is the number of the 84 commits in `148d594f..e8690f45` that changed a non-test file in the component, with the 16 commits of the domain-model restructure (`2173cbfb..e8690f45`) counted separately in the last column. Previous distance is the run-7 value at dbe88053. Generated from a cold cruise of the import graph at e8690f45: 307 modules, 776 dependencies, 0 violations, 0 circular (`.architecture/slices/run8/` holds the per-slice returns and the per-module edge table is in `dependencies.md`).

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility | of which run 8 | 79fa1e95..f0eb1bf4 |
|---|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 49 | 0 | 0.00 | 0.23 (20 / 88) | 0.77 | 0.82 | 25 | 12 | 5 |
| C2 packages/db | 15 | 0 | 0.00 | 0.00 (0 / 1) | 1.00 | 1.00 | 0 | 0 | 0 |
| C3 packages/config | 25 | 0 | 0.00 | 0.00 (0 / 12) | 1.00 | 1.00 | 5 | 0 | 2 |
| C4 packages/content | 8 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 | 1 |
| C5 packages/ui | 32 | 0 | 0.00 | 0.00 (0 / 3) | 1.00 | 1.00 | 3 | 0 | 1 |
| C6 packages/infrastructure | 34 | 13 | 0.28 | 0.00 (0 / 14) | 0.72 | 0.72 | 10 | 1 | 1 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 | 6 | 0 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 12) | 0.42 | 0.42 | 16 | 1 | 3 |
| C9 features/accounts | 15 | 15 | 0.50 | 0.00 (0 / 10) | 0.50 | 0.48 | 11 | 1 | 0 |
| C11 surfaces/public-site | 1 | 22 | 0.96 | 0.00 (0 / 11) | 0.04 | 0.05 | 12 | 1 | 0 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 | 0 |
| C13 surfaces/coach-portal | 1 | 5 | 0.83 | undefined (0 types) | 0.17 | 0.17 | 3 | 0 | 0 |
| C14 apps/platform/src/server | 3 | 11 | 0.79 | 0.00 (0 / 14) | 0.21 | 0.21 | 11 | 1 | 2 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 | 0 | 2 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 | 0 |

**C10 features/coaching-bundles is gone.** The feature folder and the `packages/domain/src/coaching-bundles` slice were both deleted; the three bundle literals, the benefits list and the presenter are one C11-private module in `surfaces/public-site/sections/pricing/` (decision D5). Its three edges (`C11 → C10`, `C10 → C1`, `C10 → C5`) left the graph with it.

Mean D 0.51, standard deviation 0.38, over the fourteen components with a defined D. Run 7 read 0.50 and 0.37 over fifteen. More than one standard deviation from the mean: C2, C3, C4, C5 (D = 1.00, concrete and depended on) and C11, C15 (near zero, the intended delivery position) — the same set as run 7. C10's departure moved the mean by +0.01 and the one-standard-deviation band's edges by less than +0.02; the nearest component to an edge, C12 at D 0.14, stays inside it. **No component was reclassified by C10 leaving the set.**

Only three components' own D moved, all by less than the 0.10 threshold. **C1 moved 0.82 → 0.77 because its abstractness rose 0.18 → 0.23: the port count held at 20 while the published type count fell 109 → 87, since the entity-folder layout stopped re-exporting twenty-two types no consumer imports.** The restructure therefore moved the domain toward the balanced line, not away from it. C9 moved 0.48 → 0.50 (fan-out 16 → 15, one import repointed away) and C11 0.05 → 0.04 (fan-out 21 → 22, the absorbed pricing module).

C1 carries the window's highest volatility, 12 of the 16 restructure commits and 25 of the branch's 84. Every one of the twelve is a move, a rename, or a behaviour-preserving internal refactor of the restructure itself: no domain entity, use case, port or boundary type changed in this window because a database, framework or vendor concern changed. That is one reason to change executed in twelve steps, not a component with many reasons. The position stays a watched screen for the next run, whose window is the first that can tell migration from volatility.

No component sits in the zone of uselessness: all 20 published abstract types in C1 have an implementer and a consumer, including the fourteen declared `export interface` and the six structural `export type` contracts (`Accounts`, `Clock`, `Logger`, `BotVerifier`, `ProductEmail`, `ManagementAuthenticator`). The unpublished `DownloadTokenGenerator` also has both (`AcquireProductsUseCase` consumes it; `RandomDownloadTokenGenerator` satisfies it structurally). One method is paid for and unused: `ProductAssets.assertReady` has no production caller, because the composition calls the adapter's own `assertReadyAtStartup()` instead; it predates this change review.

Component edge counts (distinct importing modules): see `dependencies.md`, section "Component graph". Cycles detected: none, at module, component, domain-folder and UI-subpath level, over 287 in-scope production modules. Two of the sixteen restructure commits touched three or more components — `2b6396bd` (C1, C6, C14: the feature-flag import repoint) and `9ef78f38` (C1, C10, C11: the bundle dissolution) — and both are uniform structural passes, not requirement changes crossing a boundary.

## Persisted waitlist-mode change review

The change review covers `79fa1e95..f0eb1bf4`. A cold cruise at f0eb1bf4 reads 307 modules, 778 dependencies, 0 violations and 0 circular dependencies. The last column counts the seven commits in that range that changed a non-test file in the component (`63a570a7`, `f5d1889c`, `fc2fd208`, `489f6293`, `010904d8`, `48b8cafb`, `f0eb1bf4`).

Two cells in the table differ from the e8690f45 audit. C2's fan-in fell 16 → 15 because `platform-composition.server.ts` stopped importing `DatabaseClient`. C1's published type count rose 87 → 88 because `./feature-flag` now publishes `FeatureFlagSet`, which `GetWaitlistUseCase` names instead of deriving its own copy from the reader port; abstractness stays 0.23 and distance 0.77. No instability or distance changed, so mean D stays 0.51 with standard deviation 0.38, the one-standard-deviation set is unchanged, and no component crossed the 0.10 review threshold or entered the zone of uselessness. The package packlists and handle visibility changes add no module edge.

C1 carries five of the seven commits, all serving one requirement: persisted waitlist mode read through the existing `FeatureFlagReader`. C3 remains a stable, concrete hub; its R31 finding is accepted because restructuring configuration was outside the approved behavior change. The waitlist-mode requirement changed C1, C3, C8, C14 and C15; C8's R27 finding is likewise accepted rather than used to broaden this change. Component and domain-slice graphs remain acyclic.
