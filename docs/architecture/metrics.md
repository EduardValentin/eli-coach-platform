# Metrics

Header: audit 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; last update 2026-09-28 at commit f9ecc1e5, change review (every row recomputed on one basis: distinct modules from one `dependency-cruiser` run over the production sources at f9ecc1e5, tests excluded). Definitions and reading guide: the inspection workflow's metrics reference. Computed only when the graph has more than five components.

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility (`148d594f..e8690f45`, + `7d92dc22`) | of which `2173cbfb..e8690f45` | Waitlist mode (`79fa1e95..f0eb1bf4`, `242a0976`) | Mobile navigation (`6c043f97..3836745e`) | Assessment-call booking (`843d8261..6fc3157f`) | Coaching sales (`55eca014..b26aa781`) | Client invitation (`09f08f25..1d89c4c3`) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 96 | 0 | 0.00 | 0.28 (49 / 174) | 0.72 | 0.75 | 25 + 1 | 12 | 6 | 0 | 4 | 1 | 4 |
| C2 packages/db | 34 | 0 | 0.00 | 0.00 (0 / 2) | 1.00 | 1.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| C3 packages/config | 41 | 0 | 0.00 | 0.00 (0 / 16) | 1.00 | 1.00 | 5 | 0 | 2 | 0 | 2 | 1 | 1 |
| C4 packages/content | 11 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 | 1 | 0 | 0 | 0 | 0 |
| C5 packages/ui | 67 | 0 | 0.00 | 0.00 (0 / 5) | 1.00 | 1.00 | 3 | 0 | 1 | 3 | 6 | 1 | 2 |
| C6 packages/infrastructure | 72 | 25 | 0.26 | 0.13 (6 / 46) | 0.61 | 0.60 | 10 + 1 | 1 | 1 | 0 | 2 | 1 | 3 |
| C7 features/store | 10 | 37 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 + 1 | 6 | 0 | 0 | 0 | 1 | 0 |
| C8 features/waitlist | 10 | 14 | 0.58 | 0.00 (0 / 11) | 0.42 | 0.42 | 16 + 1 | 1 | 4 | 0 | 0 | 1 | 0 |
| C9 features/accounts | 23 | 14 | 0.38 | 0.00 (0 / 11) | 0.62 | 0.55 | 11 | 1 | 0 | 0 | 0 | 0 | 4 |
| C11 surfaces/public-site | 1 | 23 | 0.96 | 0.00 (0 / 12) | 0.04 | 0.05 | 12 | 1 | 0 | 3 | 2 | 1 | 2 |
| C12 surfaces/client-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 | 0 | 0 | 0 | 0 | 1 |
| C13 surfaces/coach-portal | 1 | 6 | 0.86 | undefined (0 types) | 0.14 | 0.14 | 3 | 0 | 0 | 0 | 0 | 1 | 0 |
| C14 apps/platform/src/server | 3 | 17 | 0.85 | 0.00 (0 / 15) | 0.15 | 0.15 | 11 + 1 | 1 | 3 | 0 | 2 | 1 | 2 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 | 0 | 2 | 0 | 1 | 1 | 2 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 | 0 | 0 | 0 | 0 | 2 |
| C17 features/assessment-calls | 15 | 45 | 0.75 | 0.00 (0 / 47) | 0.25 | 0.25 | n/a | n/a | n/a | n/a | 8 | 1 | 0 |
| C18 features/coaching-sales | 11 | 47 | 0.81 | 0.00 (0 / 38) | 0.19 | 0.16 | n/a | n/a | n/a | n/a | n/a | 1 | 5 |
