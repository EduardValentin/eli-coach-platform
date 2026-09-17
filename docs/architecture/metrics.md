# Metrics

Header: date 2026-09-18, commit 64cea001, baseline 79fa1e95, scope the changed components and their direct graph neighborhood, mode change review. Definitions and reading guide: the inspection workflow's metrics reference. Computed because the graph has fifteen components.

Counting is unchanged. The baseline cold cruise at 79fa1e95 remains authoritative; a frozen-object graph walk proved the diff delta independently. The only metric edge-count change is C2 fan-in 16 → 15 after `platform-composition.server.ts` stopped importing `DatabaseClient`; no instability, abstractness or distance changed. Volatility extends the prior observation window with the five reviewed commits. C3 and C8 remain at their baseline rows because open findings dispute their candidate metric updates; the ignored ledger holds those two pending rows.

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility | Current review commits |
|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 49 | 0 | 0.00 | 0.23 (20 / 87) | 0.77 | 0.77 | 26 | 1 |
| C2 packages/db | 15 | 0 | 0.00 | 0.00 (0 / 1) | 1.00 | 1.00 | 0 | 0 |
| C3 packages/config | 25 | 0 | 0.00 | 0.00 (0 / 12) | 1.00 | 1.00 | 5 | baseline row held |
| C4 packages/content | 8 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 |
| C5 packages/ui | 32 | 0 | 0.00 | 0.00 (0 / 3) | 1.00 | 1.00 | 3 | 0 |
| C6 packages/infrastructure | 34 | 13 | 0.28 | 0.00 (0 / 14) | 0.72 | 0.72 | 10 | 0 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 | 0 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 12) | 0.42 | 0.42 | 16 | baseline row held |
| C9 features/accounts | 15 | 15 | 0.50 | 0.00 (0 / 10) | 0.50 | 0.50 | 11 | 0 |
| C11 surfaces/public-site | 1 | 22 | 0.96 | 0.00 (0 / 11) | 0.04 | 0.04 | 12 | 0 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 |
| C13 surfaces/coach-portal | 1 | 5 | 0.83 | undefined (0 types) | 0.17 | 0.17 | 3 | 0 |
| C14 apps/platform/src/server | 3 | 11 | 0.79 | 0.00 (0 / 14) | 0.21 | 0.21 | 12 | 1 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 8 | 1 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 |

Mean D remains 0.51 with standard deviation 0.38 over the fourteen components with defined distance. No component crossed the 0.10 review threshold and no component entered the zone of uselessness. C2 remains a stable concrete leaf despite losing one dependent; it has zero volatility in the observation window.

C3 remains a stable, concrete hub and changed again for a runtime concern; its candidate volatility is 6, held pending the open R31 finding. The waitlist-mode requirement changed C1, C3, C8, C14 and C15; C8's candidate volatility is 17, held pending the open R27 finding. Component and domain-slice graphs remain acyclic.
