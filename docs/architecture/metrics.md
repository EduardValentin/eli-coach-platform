# Metrics

Header: audit 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; last update 2026-09-27 at commit 0c9758d9, change review (every row recomputed on one basis: distinct modules from one `dependency-cruiser` run over the production sources at 0c9758d9, tests excluded). Definitions and reading guide: the inspection workflow's metrics reference. Computed only when the graph has more than five components.

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility (`148d594f..e8690f45`, + `7d92dc22`) | of which `2173cbfb..e8690f45` | Waitlist mode (`79fa1e95..f0eb1bf4`, `242a0976`) | Mobile navigation (`6c043f97..3836745e`) | Assessment-call booking (`843d8261..6fc3157f`) | Coaching sales (`55eca014..b26aa781`) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 86 | 0 | 0.00 | 0.25 (37 / 149) | 0.75 | 0.77 | 25 + 1 | 12 | 6 | 0 | 4 | 1 |
| C2 packages/db | 30 | 0 | 0.00 | 0.00 (0 / 2) | 1.00 | 1.00 | 0 | 0 | 0 | 0 | 0 | 0 |
| C3 packages/config | 37 | 0 | 0.00 | 0.00 (0 / 15) | 1.00 | 1.00 | 5 | 0 | 2 | 0 | 2 | 1 |
| C4 packages/content | 11 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 | 1 | 0 | 0 | 0 |
| C5 packages/ui | 65 | 0 | 0.00 | 0.00 (0 / 5) | 1.00 | 1.00 | 3 | 0 | 1 | 3 | 6 | 1 |
| C6 packages/infrastructure | 67 | 23 | 0.26 | 0.14 (6 / 43) | 0.60 | 0.68 | 10 + 1 | 1 | 1 | 0 | 2 | 1 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 + 1 | 6 | 0 | 0 | 0 | 1 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 11) | 0.42 | 0.42 | 16 + 1 | 1 | 4 | 0 | 0 | 1 |
| C9 features/accounts | 18 | 15 | 0.45 | 0.00 (0 / 10) | 0.55 | 0.53 | 11 | 1 | 0 | 0 | 0 | 0 |
| C11 surfaces/public-site | 1 | 21 | 0.95 | 0.00 (0 / 12) | 0.05 | 0.04 | 12 | 1 | 0 | 3 | 2 | 1 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 | 0 | 0 | 0 | 0 |
| C13 surfaces/coach-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.17 | 3 | 0 | 0 | 0 | 0 | 1 |
| C14 apps/platform/src/server | 3 | 17 | 0.85 | 0.00 (0 / 15) | 0.15 | 0.18 | 11 + 1 | 1 | 3 | 0 | 2 | 1 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 | 0 | 2 | 0 | 1 | 1 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 | 0 | 0 | 0 | 0 |
| C17 features/assessment-calls | 15 | 45 | 0.75 | 0.00 (0 / 47) | 0.25 | 0.20 | n/a | n/a | n/a | n/a | 8 | 1 |
| C18 features/coaching-sales | 6 | 31 | 0.84 | 0.00 (0 / 24) | 0.16 | n/a | n/a | n/a | n/a | n/a | n/a | 1 |
