# Metrics

Header: date 2026-09-15, commit 148d594f, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,ui}/src plus the enforcement layer (eslint.config.mjs, tools/lint-boundaries.test.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode audit. Definitions and reading guide: the inspection workflow's metrics reference. Computed because the graph has fifteen components.

Counting: fan-in is the number of modules outside the component that import at least one module inside it; fan-out is the number of modules inside that import at least one module in another in-scope component (externals excluded). Abstract types are port interfaces that exist only to be implemented; total types are exported classes, interfaces, and type aliases. Volatility is the number of commits among the fifteen-commit window (2026-08-11 to 2026-09-10) that changed a non-test file in the component. Previous distance is empty on this first run. Generated from the import graph at commit 148d594f (`.architecture/slices/` and `.architecture/ledger.md` run log).

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility |
|---|---|---|---|---|---|---|---|
| C1 packages/domain | 32 | 0 | 0.00 | 0.18 (17 / 95) | 0.82 | - | 5 |
| C2 packages/db | 12 | 0 | 0.00 | 0.00 (0 / 1) | 1.00 | - | 0 |
| C3 packages/config | 24 | 0 | 0.00 | 0.00 (0 / 4) | 1.00 | - | 2 |
| C4 packages/content | 7 | 0 | 0.00 | 0.00 (0 / 8) | 1.00 | - | 1 |
| C5 packages/ui | 32 | 0 | 0.00 | 0.00 (0 / 29) | 1.00 | - | 4 |
| C6 packages/infrastructure | 20 | 8 | 0.29 | 0.12 (3 / 25) | 0.59 | - | 5 |
| C7 features/store | 2 | 37 | 0.95 | 0.03 (1 / 37) | 0.02 | - | 9 |
| C8 features/waitlist | 8 | 13 | 0.62 | 0.00 (0 / 13) | 0.38 | - | 4 |
| C9 features/accounts | 7 | 13 | 0.65 | 0.09 (1 / 11) | 0.26 | - | 4 |
| C10 features/coaching-bundles | 1 | 1 | 0.50 | undefined (0 types) | 0.50 | - | 0 |
| C11 surfaces/public-site | 0 | 20 | 1.00 | 0.00 (0 / 11) | 0.00 | - | 6 |
| C12 surfaces/client-portal | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | - | 2 |
| C13 surfaces/coach-portal | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | - | 2 |
| C14 apps/platform/src/server | 23 | 4 | 0.15 | 0.00 (0 / 9) | 0.85 | - | 6 |
| C15 app root | 0 | 3 | 1.00 | undefined (0 types) | 0.00 | - | 4 |

Mean D 0.50, standard deviation 0.41. More than one standard deviation from the mean: C2, C3, C4, C5 (D = 1.00, concrete and depended on) and C7, C11, C12, C13, C15 (D near 0, at the unstable-concrete endpoint, which is the intended position for delivery code). C1 (0.82) and C14 (0.85) sit inside the band but on the zone-of-pain side: both are concrete, heavily depended on, and changed in five and six of fifteen commits.

Component edge counts (distinct importing modules): see `dependencies.md`, section "Component graph". Cycles detected in the component graph: C14 <-> C7, C14 <-> C8, C14 <-> C9 (the composition root constructs feature controllers and repositories while feature route modules import `getPlatformContainer` and `http.server` helpers).
