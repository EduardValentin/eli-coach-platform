# Metrics

Header: audit 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; last update 2026-09-23 at commit 9747d171, change review (C3 and C14 recomputed; other rows carried over). Definitions and reading guide: the inspection workflow's metrics reference. Computed only when the graph has more than five components.

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility (`148d594f..e8690f45`, + `7d92dc22`) | of which `2173cbfb..e8690f45` | Waitlist mode (`79fa1e95..f0eb1bf4`, `242a0976`) | Mobile navigation (`6c043f97..3836745e`) | Assessment-call booking (`843d8261..6fc3157f`) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 58 | 0 | 0.00 | 0.23 (26 / 115) | 0.77 | 0.77 | 25 + 1 | 12 | 6 | 0 | 4 |
| C2 packages/db | 24 | 0 | 0.00 | 0.00 (0 / 2) | 1.00 | 1.00 | 0 | 0 | 0 | 0 | 0 |
| C3 packages/config | 31 | 0 | 0.00 | 0.00 (0 / 14) | 1.00 | 1.00 | 5 | 0 | 2 | 0 | 2 |
| C4 packages/content | 11 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 | 1 | 0 | 0 |
| C5 packages/ui | 49 | 0 | 0.00 | 0.00 (0 / 5) | 1.00 | 1.00 | 3 | 0 | 1 | 3 | 6 |
| C6 packages/infrastructure | 52 | 14 | 0.21 | 0.11 (3 / 28) | 0.68 | 0.72 | 10 + 1 | 1 | 1 | 0 | 2 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 + 1 | 6 | 0 | 0 | 0 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 11) | 0.42 | 0.42 | 16 + 1 | 1 | 4 | 0 | 0 |
| C9 features/accounts | 17 | 15 | 0.47 | 0.00 (0 / 10) | 0.53 | 0.50 | 11 | 1 | 0 | 0 | 0 |
| C11 surfaces/public-site | 1 | 22 | 0.96 | 0.00 (0 / 13) | 0.04 | 0.04 | 12 | 1 | 0 | 3 | 2 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 | 0 | 0 | 0 |
| C13 surfaces/coach-portal | 1 | 5 | 0.83 | undefined (0 types) | 0.17 | 0.17 | 3 | 0 | 0 | 0 | 0 |
| C14 apps/platform/src/server | 3 | 14 | 0.82 | 0.00 (0 / 15) | 0.18 | 0.21 | 11 + 1 | 1 | 3 | 0 | 2 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 | 0 | 2 | 0 | 1 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 | 0 | 0 | 0 |
| C17 features/assessment-calls | 10 | 39 | 0.80 | 0.00 (0 / 26) | 0.20 | 0.21 | n/a | n/a | n/a | n/a | 8 |
