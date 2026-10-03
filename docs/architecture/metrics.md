# Metrics

Header: audit 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; last update 2026-10-02 at commit 1abf7f6b, change review (record-only, router mutations) (rows C1, C3, C5–C8, C12, C17–C20 recomputed from one `dependency-cruiser` run over the production sources at 1abf7f6b, tests excluded, abstractness as abstract port interfaces over exported classes, interfaces and type aliases; the other rows carried from 2b1ffb8a). Definitions and reading guide: the inspection workflow's metrics reference. Computed only when the graph has more than five components.

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility (`148d594f..e8690f45`, + `7d92dc22`) | of which `2173cbfb..e8690f45` | Waitlist mode (`79fa1e95..f0eb1bf4`, `242a0976`) | Mobile navigation (`6c043f97..3836745e`) | Assessment-call booking (`843d8261..6fc3157f`) | Coaching sales (`55eca014..b26aa781`) | Client invitation (`09f08f25..1d89c4c3`) | Client portal shell (`047bf209`) | Client onboarding (`842441bd`) | Onboarding review (`159e73bc`) | Measurements and photos (`159e73bc..2b1ffb8a`) | Router mutations (`f4082a8c..1abf7f6b`) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 165 | 0 | 0.00 | 0.22 (74 / 337) | 0.78 | 0.78 | 25 + 1 | 12 | 6 | 0 | 4 | 1 | 4 | 1 | 1 | 1 | 13 | 0 |
| C2 packages/db | 50 | 0 | 0.00 | 0.00 (0 / 2) | 1.00 | 1.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| C3 packages/config | 46 | 0 | 0.00 | 0.00 (0 / 16) | 1.00 | 1.00 | 5 | 0 | 2 | 0 | 2 | 1 | 1 | 0 | 0 | 0 | 2 | 0 |
| C4 packages/content | 14 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| C5 packages/ui | 111 | 0 | 0.00 | 0.00 (0 / 18) | 1.00 | 1.00 | 3 | 0 | 1 | 3 | 6 | 1 | 2 | 1 | 1 | 1 | 10 | 0 |
| C6 packages/infrastructure | 93 | 29 | 0.24 | 0.14 (6 / 43) | 0.62 | 0.62 | 10 + 1 | 1 | 1 | 0 | 2 | 1 | 3 | 1 | 0 | 1 | 4 | 1 |
| C7 features/store | 10 | 38 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 + 1 | 6 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| C8 features/waitlist | 10 | 15 | 0.60 | 0.00 (0 / 11) | 0.40 | 0.40 | 16 + 1 | 1 | 4 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| C9 features/accounts | 36 | 14 | 0.28 | 0.00 (0 / 11) | 0.72 | 0.62 | 11 | 1 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| C11 surfaces/public-site | 1 | 23 | 0.96 | 0.00 (0 / 13) | 0.04 | 0.04 | 12 | 1 | 0 | 3 | 2 | 1 | 2 | 0 | 1 | 0 | 0 | 0 |
| C12 surfaces/client-portal | 1 | 9 | 0.90 | 0.00 (0 / 1) | 0.10 | 0.10 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 1 | 7 | 1 |
| C13 surfaces/coach-portal | 1 | 7 | 0.88 | undefined (0 types) | 0.12 | 0.12 | 3 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 1 | 4 | 0 |
| C14 apps/platform/src/server | 3 | 18 | 0.86 | 0.00 (0 / 15) | 0.14 | 0.14 | 11 + 1 | 1 | 3 | 0 | 2 | 1 | 2 | 0 | 1 | 1 | 2 | 0 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 | 0 | 2 | 0 | 1 | 1 | 2 | 1 | 1 | 1 | 3 | 0 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| C17 features/assessment-calls | 21 | 45 | 0.68 | 0.00 (0 / 47) | 0.32 | 0.32 | n/a | n/a | n/a | n/a | 8 | 1 | 0 | 0 | 1 | 1 | 0 | 1 |
| C18 features/coaching-sales | 20 | 67 | 0.77 | 0.00 (0 / 63) | 0.23 | 0.23 | n/a | n/a | n/a | n/a | n/a | 1 | 5 | 1 | 1 | 1 | 2 | 1 |
| C19 features/client-onboarding | 6 | 46 | 0.88 | 0.00 (0 / 46) | 0.12 | 0.12 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 1 | 1 | 12 | 3 |
| C20 features/client-profile | 16 | 36 | 0.69 | 0.00 (0 / 23) | 0.31 | 0.30 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 1 | 29 | 2 |
