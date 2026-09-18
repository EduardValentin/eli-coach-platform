# Metrics

Header: date 2026-09-18, commit a79f507d (base 79fa1e95), scope 43 changed implementation files in C1, C6, C7, C8 and C14 plus direct neighbors, mode partial change review (run 8 baseline e8690f45). Definitions and reading guide: the inspection workflow's metrics reference. Computed because the graph has fifteen components.

Counting: fan-in is the number of modules outside the component that import at least one module inside it; fan-out is the number of modules inside that import at least one module in another in-scope component (externals excluded). Abstract types are port interfaces that exist only to be implemented; total types are exported classes, interfaces, and type aliases. The `a79f507d` change review recomputes C1, C6, C7, C8 and C14; other rows are carried from run 8. Volatility keeps run 8's count of the 84 commits in `148d594f..e8690f45` that changed a non-test file in the component, with the 16 commits of the domain-model restructure (`2173cbfb..e8690f45`) in the last column, and adds `a79f507d` as `+ 1` to each component it changed. Previous distance is the run-8 value at `e8690f45` for the five recomputed rows; the carried rows keep run 8's comparison with run 7 at `dbe88053`. Generated from a cold cruise of the import graph at `a79f507d`: 287 production modules, 782 dependencies, 0 violations, 0 circular.

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility | of which run 8 |
|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 41 | 0 | 0.00 | 0.23 (18 / 79) | 0.77 | 0.77 | 25 + 1 | 12 |
| C2 packages/db | 16 | 0 | 0.00 | 0.00 (0 / 1) | 1.00 | 1.00 | 0 | 0 |
| C3 packages/config | 25 | 0 | 0.00 | 0.00 (0 / 12) | 1.00 | 1.00 | 5 | 0 |
| C4 packages/content | 8 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 |
| C5 packages/ui | 32 | 0 | 0.00 | 0.00 (0 / 3) | 1.00 | 1.00 | 3 | 0 |
| C6 packages/infrastructure | 39 | 8 | 0.17 | 0.13 (3 / 24) | 0.70 | 0.72 | 10 + 1 | 1 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 + 1 | 6 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 12) | 0.42 | 0.42 | 16 + 1 | 1 |
| C9 features/accounts | 15 | 15 | 0.50 | 0.00 (0 / 10) | 0.50 | 0.48 | 11 | 1 |
| C11 surfaces/public-site | 1 | 22 | 0.96 | 0.00 (0 / 11) | 0.04 | 0.05 | 12 | 1 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 |
| C13 surfaces/coach-portal | 1 | 5 | 0.83 | undefined (0 types) | 0.17 | 0.17 | 3 | 0 |
| C14 apps/platform/src/server | 3 | 11 | 0.79 | 0.00 (0 / 14) | 0.21 | 0.21 | 11 + 1 | 1 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 | 0 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 |

**C10 features/coaching-bundles is gone.** The feature folder and the `packages/domain/src/coaching-bundles` slice were both deleted; the three bundle literals, the benefits list and the presenter are one C11-private module in `surfaces/public-site/sections/pricing/` (decision D5). Its three edges (`C11 → C10`, `C10 → C1`, `C10 → C5`) left the graph with it.

Mean D 0.51, population standard deviation 0.38, over the fourteen components with a defined D. More than one standard deviation from the mean: C2, C3, C4, C5 (D = 1.00, concrete and depended on) and C11, C15 (near zero, the intended delivery position), unchanged from run 8. No touched component crossed the 0.10 distance threshold.

`a79f507d` leaves C1 at D 0.77: four shared ports left C1 and two consumer-owned incident interfaces were added, taking abstract/total types from 20/87 to 18/79. C6 moves 0.72 → 0.70: it gains those three adapter-facing interfaces while eight of its former C1-dependent modules become concern-local, taking fan-out 13 → 8 and fan-in 34 → 39. C7, C8 and C14 keep their prior distances.

C1 carries the window's highest volatility, 12 of the 16 restructure commits and 25 of the branch's 84. Every one of the twelve is a move, a rename, or a behaviour-preserving internal refactor of the restructure itself: no domain entity, use case, port or boundary type changed in this window because a database, framework or vendor concern changed. That is one reason to change executed in twelve steps, not a component with many reasons. The position stays a watched screen for the next run, whose window is the first that can tell migration from volatility.

No component sits in the zone of uselessness: all 18 published abstract types in C1 have an implementer and a consumer, including `AcquisitionIncidents` and `WaitlistIncidents`. C6's three new concern contracts each have at least one implementation and outside consumer. The unpublished `DownloadTokenGenerator` also has both (`AcquireProductsUseCase` consumes it; `RandomDownloadTokenGenerator` satisfies it structurally). One method is paid for and unused: `ProductAssets.assertReady` has no production caller, because the composition calls the adapter's own `assertReadyAtStartup()` instead; it predates this change review.

Component edge counts (distinct importing modules): see `dependencies.md`, section "Component graph". Cycles detected: none, at module, component, domain-folder and UI-subpath level, over 287 in-scope production modules. `a79f507d` is one coherent ownership refactor across C1, C6, C7, C8 and C14, not five independent requirement changes.
