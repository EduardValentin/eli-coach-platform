# Metrics

Header: date 2026-09-18, commit bf565d77, baseline 79fa1e95, scope the changed components and their direct graph neighborhood, mode change and final remediation review. Definitions and reading guide: the inspection workflow's metrics reference. Computed because the graph has fifteen components.

Counting is unchanged from the reviewed source graph. The only metric edge-count change from baseline is C2 fan-in 16 → 15 after `platform-composition.server.ts` stopped importing `DatabaseClient`; packlists and visibility modifiers add no edge, so no instability, abstractness or distance changed. Volatility extends the prior observation window with the seven reviewed source commits. C3 and C8 include the previously held candidate updates because their cohesion findings were explicitly accepted rather than implemented.

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility | Current review commits |
|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 49 | 0 | 0.00 | 0.23 (20 / 87) | 0.77 | 0.77 | 28 | 3 |
| C2 packages/db | 15 | 0 | 0.00 | 0.00 (0 / 1) | 1.00 | 1.00 | 0 | 0 |
| C3 packages/config | 25 | 0 | 0.00 | 0.00 (0 / 12) | 1.00 | 1.00 | 7 | 2 |
| C4 packages/content | 8 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 3 | 1 |
| C5 packages/ui | 32 | 0 | 0.00 | 0.00 (0 / 3) | 1.00 | 1.00 | 4 | 1 |
| C6 packages/infrastructure | 34 | 13 | 0.28 | 0.00 (0 / 14) | 0.72 | 0.72 | 11 | 1 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 | 0 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 12) | 0.42 | 0.42 | 18 | 2 |
| C9 features/accounts | 15 | 15 | 0.50 | 0.00 (0 / 10) | 0.50 | 0.50 | 11 | 0 |
| C11 surfaces/public-site | 1 | 22 | 0.96 | 0.00 (0 / 11) | 0.04 | 0.04 | 12 | 0 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 |
| C13 surfaces/coach-portal | 1 | 5 | 0.83 | undefined (0 types) | 0.17 | 0.17 | 3 | 0 |
| C14 apps/platform/src/server | 3 | 11 | 0.79 | 0.00 (0 / 14) | 0.21 | 0.21 | 13 | 2 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 9 | 2 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 |

Mean D remains 0.51 with standard deviation 0.38 over the fourteen components with defined distance. No component crossed the 0.10 review threshold and no component entered the zone of uselessness. C2 remains a stable concrete leaf despite losing one dependent; it has zero volatility in the observation window.

C3 remains a stable, concrete hub; its latest package-manifest change affects only the deploy packlist, and its R31 finding remains accepted because restructuring configuration was outside the approved behavior-preserving change. The waitlist-mode requirement changed C1, C3, C8, C14 and C15; C8's R27 finding is likewise accepted rather than used to broaden this change. Component and domain-slice graphs remain acyclic.
