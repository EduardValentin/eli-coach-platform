# Metrics

Header: date 2026-09-17, commit dbe88053, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,test-support,ui}/src plus the enforcement layer (tools/dependency-cruiser.config.cjs, tools/dependency-cruiser.tsconfig.json, tools/boundaries.test.mjs, tools/boundary-fixtures/, knip.json, eslint.config.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode change review (run 7). Definitions and reading guide: the inspection workflow's metrics reference. Computed because the graph has sixteen components.

Counting: fan-in is the number of modules outside the component that import at least one module inside it; fan-out is the number of modules inside that import at least one module in another in-scope component (externals excluded). Abstract types are port interfaces that exist only to be implemented; total types are exported classes, interfaces, and type aliases. Volatility is the number of the 48 commits in `148d594f..871196af` that changed a non-test file in the component. Previous distance is the run-1 value at 148d594f. Generated from the import graph at 871196af (`.architecture/slices/run6/` and `.architecture/ledger.md` run log).

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility |
|---|---|---|---|---|---|---|---|
| C1 packages/domain | 50 | 0 | 0.00 | 0.18 (20 / 109) | 0.82 | 0.82 | 13 |
| C2 packages/db | 16 | 0 | 0.00 | 0.00 (0 / 1) | 1.00 | 1.00 | 0 |
| C3 packages/config | 25 | 0 | 0.00 | 0.00 (0 / 12) | 1.00 | 1.00 | 5 |
| C4 packages/content | 8 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 |
| C5 packages/ui | 32 | 0 | 0.00 | 0.00 (0 / 3) | 1.00 | 1.00 | 3 |
| C6 packages/infrastructure | 34 | 13 | 0.28 | 0.00 (0 / 14) | 0.72 | 0.59 | 9 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.02 | 23 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 12) | 0.42 | 0.38 | 15 |
| C9 features/accounts | 15 | 16 | 0.52 | 0.00 (0 / 10) | 0.48 | 0.26 | 10 |
| C10 features/coaching-bundles | 1 | 2 | 0.67 | 0.00 (0 / 1) | 0.33 | 0.50 | 4 |
| C11 surfaces/public-site | 1 | 21 | 0.95 | 0.00 (0 / 10) | 0.05 | 0.00 | 11 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.00 | 3 |
| C13 surfaces/coach-portal | 1 | 5 | 0.83 | undefined (0 types) | 0.17 | 0.00 | 3 |
| C14 apps/platform/src/server | 3 | 11 | 0.79 | 0.00 (0 / 14) | 0.21 | 0.85 | 10 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | new | 3 |

Mean D 0.50, standard deviation 0.37. More than one standard deviation from the mean: C2, C3, C4, C5 (D = 1.00, concrete and depended on) and C11, C15 (near zero, the intended delivery position). **C14's D moved 0.85 → 0.21 as its fan-in fell 23 → 3: the zone-of-pain position run 1 flagged is resolved, and the composition root now sits where a composition root belongs — imported by almost nothing, importing everything.** C7 (0.02 → 0.21), C12 (0.00 → 0.14) and C13 (0.00 → 0.17) left the flagged band. **C6 moved 0.59 → 0.72 (fan-in 20 → 34, abstractness 0.12 → 0.00) because its three ports moved to C1: the inversion is correct, and the cost is that C6 is now purely concrete and more depended on — the climb run 1 predicted is confirmed and stays a watched screen.** C1 holds D 0.82 with fan-in 32 → 50, 20 ports of 109 types, and the window's highest volatility (13 of 48), most of it the one-time migration of rules inward. No component sits in the zone of uselessness: all 20 abstract types in C1 have an implementer and a consumer.

Component edge counts (distinct importing modules): see `dependencies.md`, section "Component graph". Cycles detected: none, at module, component, domain-slice and UI-subpath level. Seventeen of the 48 commits touched three or more components; each is a uniform structural or tooling pass (route fragments, domain subpaths, the knip sweep, the design-system split), not a requirement change crossing a boundary.
