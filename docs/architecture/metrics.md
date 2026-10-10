# Metrics

Header: audit 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; last update 2026-10-10 at commit 303c97c9, change review (fan-in and fan-out of C6, C9, C17, C22 and C23 recomputed from one `dependency-cruiser` run over the production sources at 303c97c9, tests excluded, fan-in as importing modules outside the component and fan-out as the component's modules importing outside it; C6's abstractness recounted without the moved coach-calendar and meeting-room classes and type; previous distance for those rows is the value at 594bb0ab; C1–C5, C18 and C19 carried from 119f8e62, tests excluded, the other rows carried from aa4323e6 and e34f8e38; C1's and C6's abstractness recounted at 119f8e62 as abstract port interfaces over exported classes, interfaces and type aliases, the other rows carried; previous distance is the value at e34f8e38 for the recomputed rows and at c857226e for the carried ones).

| Component | Fan-in | Fan-out | Instability | Abstractness | Distance | Previous distance | Volatility (`148d594f..e8690f45`, + `7d92dc22`) | of which `2173cbfb..e8690f45` | Waitlist mode (`79fa1e95..f0eb1bf4`, `242a0976`) | Mobile navigation (`6c043f97..3836745e`) | Assessment-call booking (`843d8261..6fc3157f`) | Coaching sales (`55eca014..b26aa781`) | Client invitation (`09f08f25..1d89c4c3`) | Client portal shell (`047bf209`) | Client onboarding (`842441bd`) | Onboarding review (`159e73bc`) | Measurements and photos (`159e73bc..2b1ffb8a`) | Router mutations (`f4082a8c..1abf7f6b`) | Subscription lifecycle (`dd2b8fb6..ca8692f4`) | Check-ins story 1 (`7174df1b..119f8e62`) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 packages/domain | 208 | 0 | 0.00 | 0.20 (91 / 464) | 0.80 | 0.79 | 25 + 1 | 12 | 6 | 0 | 4 | 1 | 4 | 1 | 1 | 1 | 13 | 0 | 12 | 2 |
| C2 packages/db | 59 | 0 | 0.00 | 0.00 (0 / 2) | 1.00 | 1.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| C3 packages/config | 50 | 0 | 0.00 | 0.00 (0 / 16) | 1.00 | 1.00 | 5 | 0 | 2 | 0 | 2 | 1 | 1 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| C4 packages/content | 20 | 0 | 0.00 | 0.00 (0 / 7) | 1.00 | 1.00 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| C5 packages/ui | 141 | 0 | 0.00 | 0.00 (0 / 18) | 1.00 | 1.00 | 3 | 0 | 1 | 3 | 6 | 1 | 2 | 1 | 1 | 1 | 10 | 0 | 3 | 5 |
| C6 packages/infrastructure | 126 | 30 | 0.19 | 0.14 (10 / 69) | 0.67 | 0.64 | 10 + 1 | 1 | 1 | 0 | 2 | 1 | 3 | 1 | 0 | 1 | 4 | 1 | 6 | 3 |
| C7 features/store | 10 | 38 | 0.79 | 0.00 (0 / 37) | 0.21 | 0.21 | 29 + 1 | 6 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
| C8 features/waitlist | 10 | 15 | 0.60 | 0.00 (0 / 11) | 0.40 | 0.40 | 16 + 1 | 1 | 4 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| C9 features/accounts | 47 | 14 | 0.23 | 0.00 (0 / 11) | 0.77 | 0.76 | 11 | 1 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| C11 surfaces/public-site | 1 | 23 | 0.96 | 0.00 (0 / 13) | 0.04 | 0.04 | 12 | 1 | 0 | 3 | 2 | 1 | 2 | 0 | 1 | 0 | 0 | 0 | 2 | 0 |
| C12 surfaces/client-portal | 1 | 9 | 0.90 | 0.00 (0 / 1) | 0.10 | 0.10 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 1 | 7 | 1 | 2 | 2 |
| C13 surfaces/coach-portal | 1 | 9 | 0.90 | undefined (0 types) | 0.12 | 0.12 | 3 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 1 | 4 | 0 | 1 | 2 |
| C14 apps/platform/src/server | 3 | 18 | 0.86 | 0.00 (0 / 15) | 0.14 | 0.14 | 11 + 1 | 1 | 3 | 0 | 2 | 1 | 2 | 0 | 1 | 1 | 2 | 0 | 3 | 3 |
| C15 app root | 0 | 4 | 1.00 | undefined (0 types) | 0.00 | 0.00 | 7 | 0 | 2 | 0 | 1 | 1 | 2 | 1 | 1 | 1 | 3 | 0 | 0 | 2 |
| C16 packages/test-support | 0 | 0 | undefined | undefined (0 types) | undefined | undefined | 3 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| C17 features/assessment-calls | 26 | 38 | 0.59 | 0.00 (0 / 47) | 0.41 | 0.38 | n/a | n/a | n/a | n/a | 8 | 1 | 0 | 0 | 1 | 1 | 0 | 1 | 0 | 5 |
| C18 features/coaching-sales | 32 | 95 | 0.75 | 0.00 (0 / 84) | 0.25 | 0.24 | n/a | n/a | n/a | n/a | n/a | 1 | 5 | 1 | 1 | 1 | 2 | 1 | 20 | 3 |
| C19 features/client-onboarding | 6 | 47 | 0.89 | 0.00 (0 / 46) | 0.11 | 0.12 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 1 | 1 | 12 | 3 | 4 | 1 |
| C20 features/client-profile | 16 | 36 | 0.69 | 0.00 (0 / 23) | 0.31 | 0.31 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 1 | 29 | 2 | 1 | 0 |
| C21 features/client-resources | 9 | 23 | 0.72 | 0.00 (0 / 23) | 0.28 | 0.21 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 0 |
| C22 features/check-ins | 8 | 28 | 0.78 | 0.00 (0 interfaces) | 0.22 | 0.19 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 4 |
| C23 features/coach-schedule | 7 | 12 | 0.63 | 0.00 (0 / 16) | 0.37 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
