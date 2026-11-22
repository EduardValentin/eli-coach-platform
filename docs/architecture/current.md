# Architecture: current picture

This file is rewritten by `arch collect` and is never edited by hand.

## Counts

- Components: 52
- Units: 1706
- Edges: 6129
- Module cycles: 0
- Component cycles: 0
- Uncovered units: 0

## Metrics

| Component | Units | Fan-in | Fan-out | Instability | Abstractness | Distance | Zone |
|---|---|---|---|---|---|---|---|
| apps/platform/src/shared/database | 9 | 83 | 1 | 0.01 | 0.22 | 0.77 | none |
| apps/platform/src/shared/design-system | 134 | 201 | 0 | 0 | 0.09 | 0.91 | pain |
| apps/platform/src/bounded-contexts/sales/store | 151 | 6 | 58 | 0.91 | 0.39 | 0.3 | none |
| apps/platform/src/bounded-contexts/sales/waitlist | 38 | 13 | 16 | 0.55 | 0.41 | 0.04 | none |
| apps/platform/src/bounded-contexts/access/accounts | 66 | 14 | 26 | 0.65 | 0.37 | 0.02 | none |
| apps/platform/src/surfaces/public-site | 29 | 1 | 21 | 0.95 | 0.19 | 0.14 | none |
| apps/platform/src/surfaces/client-portal | 14 | 1 | 10 | 0.91 | 0.08 | 0.01 | none |
| apps/platform/src/surfaces/coach-portal | 13 | 1 | 11 | 0.92 | 0.03 | 0.06 | none |
| apps/platform/src/composition-root | 17 | 3 | 9 | 0.75 | 0.29 | 0.04 | none |
| apps/platform | 6 | 0 | 4 | 1 | 0 | 0 | none |
| apps/platform/test-support | 0 | 0 | 0 | not defined | not defined | not defined | none |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | 76 | 24 | 44 | 0.65 | 0.3 | 0.05 | none |
| apps/platform/src/bounded-contexts/sales/subscriptions | 160 | 10 | 68 | 0.87 | 0.28 | 0.15 | none |
| apps/platform/src/bounded-contexts/clients/client-profile | 242 | 12 | 101 | 0.89 | 0.29 | 0.18 | none |
| apps/platform/src/bounded-contexts/clients/client-resources | 83 | 8 | 38 | 0.83 | 0.31 | 0.13 | none |
| apps/platform/src/bounded-contexts/clients/check-ins | 134 | 9 | 61 | 0.87 | 0.33 | 0.2 | none |
| apps/platform/src/bounded-contexts/scheduling/coach-schedule | 41 | 12 | 15 | 0.56 | 0.28 | 0.17 | none |
| apps/platform/src/bounded-contexts/clients/clients | 94 | 42 | 38 | 0.48 | 0.32 | 0.21 | none |
| apps/platform/src/bounded-contexts/programs/exercise-library | 64 | 7 | 25 | 0.78 | 0.32 | 0.1 | none |
| apps/platform/src/bounded-contexts/programs/nutrition-library | 76 | 5 | 31 | 0.86 | 0.32 | 0.18 | none |
| apps/platform/src/bounded-contexts/clients/notifications | 26 | 9 | 10 | 0.53 | 0.34 | 0.13 | none |
| apps/platform/src/bounded-contexts/operations/feature-flags | 19 | 4 | 7 | 0.64 | 0.27 | 0.1 | none |
| apps/platform/src/bounded-contexts/legal/legal | 11 | 2 | 5 | 0.71 | 0.38 | 0.09 | none |
| apps/platform/src/bounded-contexts/operations/public | 2 | 9 | 0 | 0 | 0.5 | 0.5 | none |
| apps/platform/src/bounded-contexts/legal/public | 6 | 11 | 1 | 0.08 | 0.23 | 0.68 | none |
| apps/platform/src/bounded-contexts/access/public | 4 | 78 | 0 | 0 | 0.46 | 0.54 | none |
| apps/platform/src/bounded-contexts/scheduling/public | 7 | 27 | 0 | 0 | 0.92 | 0.08 | none |
| apps/platform/src/bounded-contexts/operations | 3 | 2 | 3 | 0.6 | 0.33 | 0.07 | none |
| apps/platform/src/bounded-contexts/legal | 2 | 2 | 2 | 0.5 | 0.33 | 0.17 | none |
| apps/platform/src/bounded-contexts/access | 3 | 2 | 3 | 0.6 | 0.33 | 0.07 | none |
| apps/platform/src/bounded-contexts/scheduling | 4 | 13 | 4 | 0.24 | 0.14 | 0.62 | none |
| apps/platform/src/bounded-contexts/clients | 4 | 22 | 4 | 0.15 | 0.11 | 0.74 | pain |
| apps/platform/src/bounded-contexts/programs | 3 | 4 | 3 | 0.43 | 0.33 | 0.24 | none |
| apps/platform/src/bounded-contexts/sales | 3 | 10 | 3 | 0.23 | 0.33 | 0.44 | none |
| apps/platform/src/bounded-contexts/sales/shared/payments | 26 | 17 | 7 | 0.29 | 0.52 | 0.19 | none |
| apps/platform/src/shared/brand | 1 | 17 | 0 | 0 | 0 | 1 | pain |
| apps/platform/src/shared/clock | 3 | 3 | 0 | 0 | 0 | 1 | pain |
| apps/platform/src/shared/contact | 2 | 10 | 0 | 0 | 0.25 | 0.75 | none |
| apps/platform/src/shared/documents | 12 | 6 | 0 | 0 | 0.45 | 0.55 | none |
| apps/platform/src/shared/email | 11 | 38 | 1 | 0.03 | 0.07 | 0.9 | pain |
| apps/platform/src/shared/http | 16 | 162 | 0 | 0 | 0.11 | 0.89 | pain |
| apps/platform/src/shared/images | 1 | 4 | 0 | 0 | 0.33 | 0.67 | none |
| apps/platform/src/shared/logging | 3 | 29 | 0 | 0 | 0.25 | 0.75 | none |
| apps/platform/src/shared/private-files | 5 | 10 | 0 | 0 | 0 | 1 | pain |
| apps/platform/src/shared/pwa | 3 | 7 | 1 | 0.13 | 0 | 0.88 | pain |
| apps/platform/src/shared/runtime | 1 | 10 | 0 | 0 | 0.5 | 0.5 | none |
| apps/platform/src/shared/submission-checks | 20 | 24 | 1 | 0.04 | 0.23 | 0.73 | none |
| apps/platform/src/shared/time-format | 2 | 18 | 0 | 0 | 0 | 1 | pain |
| apps/platform/src/shared/tokens | 6 | 1 | 2 | 0.67 | 0.33 | 0 | none |
| apps/platform/src/bounded-contexts/programs/training-programs | 41 | 4 | 13 | 0.76 | 0.48 | 0.25 | none |
| apps/platform/src/bounded-contexts/clients/public | 7 | 21 | 0 | 0 | 0.94 | 0.06 | none |
| apps/platform/src/bounded-contexts/sales/public | 2 | 18 | 0 | 0 | 0.5 | 0.5 | none |

## Component graph

| From | To | Modules |
|---|---|---|
| apps/platform | apps/platform/src/bounded-contexts/access | 1 |
| apps/platform | apps/platform/src/bounded-contexts/access/accounts | 1 |
| apps/platform | apps/platform/src/bounded-contexts/access/public | 1 |
| apps/platform | apps/platform/src/bounded-contexts/clients | 1 |
| apps/platform | apps/platform/src/bounded-contexts/operations | 1 |
| apps/platform | apps/platform/src/bounded-contexts/programs | 1 |
| apps/platform | apps/platform/src/bounded-contexts/sales | 1 |
| apps/platform | apps/platform/src/bounded-contexts/sales/public | 1 |
| apps/platform | apps/platform/src/bounded-contexts/scheduling | 1 |
| apps/platform | apps/platform/src/composition-root | 2 |
| apps/platform | apps/platform/src/shared/design-system | 2 |
| apps/platform | apps/platform/src/shared/http | 1 |
| apps/platform | apps/platform/src/surfaces/client-portal | 1 |
| apps/platform | apps/platform/src/surfaces/coach-portal | 1 |
| apps/platform | apps/platform/src/surfaces/public-site | 1 |
| apps/platform/src/bounded-contexts/access | apps/platform/src/bounded-contexts/access/accounts | 3 |
| apps/platform/src/bounded-contexts/access/accounts | apps/platform/src/bounded-contexts/access/public | 11 |
| apps/platform/src/bounded-contexts/access/accounts | apps/platform/src/shared/brand | 1 |
| apps/platform/src/bounded-contexts/access/accounts | apps/platform/src/shared/database | 4 |
| apps/platform/src/bounded-contexts/access/accounts | apps/platform/src/shared/design-system | 5 |
| apps/platform/src/bounded-contexts/access/accounts | apps/platform/src/shared/email | 3 |
| apps/platform/src/bounded-contexts/access/accounts | apps/platform/src/shared/http | 8 |
| apps/platform/src/bounded-contexts/access/accounts | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/access/accounts | apps/platform/src/shared/runtime | 1 |
| apps/platform/src/bounded-contexts/clients | apps/platform/src/bounded-contexts/clients/check-ins | 3 |
| apps/platform/src/bounded-contexts/clients | apps/platform/src/bounded-contexts/clients/client-profile | 3 |
| apps/platform/src/bounded-contexts/clients | apps/platform/src/bounded-contexts/clients/client-resources | 3 |
| apps/platform/src/bounded-contexts/clients | apps/platform/src/bounded-contexts/clients/clients | 4 |
| apps/platform/src/bounded-contexts/clients | apps/platform/src/bounded-contexts/clients/notifications | 3 |
| apps/platform/src/bounded-contexts/clients | apps/platform/src/bounded-contexts/clients/public | 1 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/bounded-contexts/access/public | 6 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/bounded-contexts/clients/clients | 5 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/bounded-contexts/clients/notifications | 4 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/bounded-contexts/clients/public | 2 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/bounded-contexts/scheduling | 1 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/bounded-contexts/scheduling/assessment-calls | 4 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/bounded-contexts/scheduling/coach-schedule | 3 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/bounded-contexts/scheduling/public | 8 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/shared/brand | 7 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/shared/database | 5 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/shared/design-system | 19 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/shared/email | 4 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/shared/http | 20 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/shared/pwa | 1 |
| apps/platform/src/bounded-contexts/clients/check-ins | apps/platform/src/shared/time-format | 8 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/bounded-contexts/access/public | 14 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/bounded-contexts/clients/clients | 14 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/bounded-contexts/clients/public | 3 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/bounded-contexts/scheduling/assessment-calls | 4 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/bounded-contexts/scheduling/coach-schedule | 1 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/bounded-contexts/scheduling/public | 3 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/brand | 1 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/contact | 2 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/database | 12 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/design-system | 41 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/email | 4 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/http | 28 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/images | 2 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/private-files | 3 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/pwa | 1 |
| apps/platform/src/bounded-contexts/clients/client-profile | apps/platform/src/shared/runtime | 1 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/bounded-contexts/access/public | 4 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/bounded-contexts/clients/clients | 4 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/shared/database | 3 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/shared/design-system | 13 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/shared/documents | 2 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/shared/http | 11 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/shared/images | 1 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/shared/private-files | 3 |
| apps/platform/src/bounded-contexts/clients/client-resources | apps/platform/src/shared/pwa | 1 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/bounded-contexts/access/public | 9 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/bounded-contexts/clients/public | 4 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/bounded-contexts/scheduling/assessment-calls | 3 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/bounded-contexts/scheduling/public | 2 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/shared/clock | 1 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/shared/contact | 2 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/shared/database | 10 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/shared/design-system | 11 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/shared/http | 7 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/clients/clients | apps/platform/src/shared/time-format | 1 |
| apps/platform/src/bounded-contexts/clients/notifications | apps/platform/src/bounded-contexts/access/public | 1 |
| apps/platform/src/bounded-contexts/clients/notifications | apps/platform/src/bounded-contexts/clients/clients | 3 |
| apps/platform/src/bounded-contexts/clients/notifications | apps/platform/src/shared/database | 3 |
| apps/platform/src/bounded-contexts/clients/notifications | apps/platform/src/shared/design-system | 1 |
| apps/platform/src/bounded-contexts/clients/notifications | apps/platform/src/shared/http | 3 |
| apps/platform/src/bounded-contexts/clients/notifications | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/legal | apps/platform/src/bounded-contexts/legal/legal | 2 |
| apps/platform/src/bounded-contexts/legal/legal | apps/platform/src/bounded-contexts/legal/public | 5 |
| apps/platform/src/bounded-contexts/legal/legal | apps/platform/src/shared/design-system | 1 |
| apps/platform/src/bounded-contexts/legal/public | apps/platform/src/shared/brand | 1 |
| apps/platform/src/bounded-contexts/operations | apps/platform/src/bounded-contexts/operations/feature-flags | 3 |
| apps/platform/src/bounded-contexts/operations/feature-flags | apps/platform/src/bounded-contexts/operations/public | 3 |
| apps/platform/src/bounded-contexts/operations/feature-flags | apps/platform/src/shared/database | 3 |
| apps/platform/src/bounded-contexts/operations/feature-flags | apps/platform/src/shared/http | 2 |
| apps/platform/src/bounded-contexts/operations/feature-flags | apps/platform/src/shared/runtime | 2 |
| apps/platform/src/bounded-contexts/programs | apps/platform/src/bounded-contexts/clients/public | 1 |
| apps/platform/src/bounded-contexts/programs | apps/platform/src/bounded-contexts/programs/exercise-library | 3 |
| apps/platform/src/bounded-contexts/programs | apps/platform/src/bounded-contexts/programs/nutrition-library | 3 |
| apps/platform/src/bounded-contexts/programs | apps/platform/src/bounded-contexts/programs/training-programs | 3 |
| apps/platform/src/bounded-contexts/programs | apps/platform/src/bounded-contexts/sales/public | 1 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/bounded-contexts/access/accounts | 1 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/bounded-contexts/access/public | 2 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/shared/database | 3 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/shared/design-system | 8 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/shared/documents | 1 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/shared/http | 10 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/shared/private-files | 2 |
| apps/platform/src/bounded-contexts/programs/exercise-library | apps/platform/src/shared/runtime | 1 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/bounded-contexts/access/accounts | 1 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/bounded-contexts/access/public | 3 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/shared/database | 5 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/shared/design-system | 13 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/shared/http | 9 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/shared/images | 1 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/shared/private-files | 2 |
| apps/platform/src/bounded-contexts/programs/nutrition-library | apps/platform/src/shared/runtime | 1 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/bounded-contexts/access/public | 2 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/bounded-contexts/clients | 3 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/bounded-contexts/clients/client-resources | 1 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/bounded-contexts/clients/clients | 1 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/bounded-contexts/clients/public | 3 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/bounded-contexts/programs/exercise-library | 2 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/bounded-contexts/sales/public | 2 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/bounded-contexts/scheduling/assessment-calls | 2 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/shared/database | 3 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/shared/design-system | 3 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/shared/http | 1 |
| apps/platform/src/bounded-contexts/programs/training-programs | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/sales | apps/platform/src/bounded-contexts/access/public | 1 |
| apps/platform/src/bounded-contexts/sales | apps/platform/src/bounded-contexts/sales/public | 2 |
| apps/platform/src/bounded-contexts/sales | apps/platform/src/bounded-contexts/sales/shared/payments | 1 |
| apps/platform/src/bounded-contexts/sales | apps/platform/src/bounded-contexts/sales/store | 3 |
| apps/platform/src/bounded-contexts/sales | apps/platform/src/bounded-contexts/sales/subscriptions | 3 |
| apps/platform/src/bounded-contexts/sales | apps/platform/src/bounded-contexts/sales/waitlist | 3 |
| apps/platform/src/bounded-contexts/sales/shared/payments | apps/platform/src/shared/database | 3 |
| apps/platform/src/bounded-contexts/sales/shared/payments | apps/platform/src/shared/http | 2 |
| apps/platform/src/bounded-contexts/sales/shared/payments | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/sales/shared/payments | apps/platform/src/shared/runtime | 1 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/bounded-contexts/access/public | 2 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/bounded-contexts/legal/public | 4 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/bounded-contexts/sales/public | 6 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/bounded-contexts/sales/shared/payments | 5 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/shared/brand | 2 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/shared/database | 7 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/shared/design-system | 12 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/shared/email | 6 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/shared/http | 24 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/shared/runtime | 1 |
| apps/platform/src/bounded-contexts/sales/store | apps/platform/src/shared/submission-checks | 7 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/access/public | 4 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/clients | 4 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/clients/clients | 1 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/clients/public | 7 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/operations/public | 2 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/sales/public | 2 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/sales/shared/payments | 10 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/sales/waitlist | 2 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/scheduling | 2 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/scheduling/assessment-calls | 3 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/bounded-contexts/scheduling/public | 4 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/shared/database | 6 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/shared/design-system | 24 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/shared/email | 8 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/shared/http | 15 |
| apps/platform/src/bounded-contexts/sales/subscriptions | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/bounded-contexts/legal/public | 2 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/bounded-contexts/operations/public | 2 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/shared/brand | 1 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/shared/database | 3 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/shared/design-system | 2 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/shared/email | 4 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/shared/http | 3 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/sales/waitlist | apps/platform/src/shared/submission-checks | 5 |
| apps/platform/src/bounded-contexts/scheduling | apps/platform/src/bounded-contexts/scheduling/assessment-calls | 4 |
| apps/platform/src/bounded-contexts/scheduling | apps/platform/src/bounded-contexts/scheduling/coach-schedule | 4 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/bounded-contexts/access/public | 1 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/bounded-contexts/operations/public | 2 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/bounded-contexts/scheduling/coach-schedule | 4 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/bounded-contexts/scheduling/public | 5 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/brand | 2 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/clock | 1 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/contact | 6 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/database | 3 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/design-system | 17 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/email | 7 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/http | 6 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/logging | 2 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/submission-checks | 4 |
| apps/platform/src/bounded-contexts/scheduling/assessment-calls | apps/platform/src/shared/time-format | 9 |
| apps/platform/src/bounded-contexts/scheduling/coach-schedule | apps/platform/src/bounded-contexts/access/public | 2 |
| apps/platform/src/bounded-contexts/scheduling/coach-schedule | apps/platform/src/bounded-contexts/scheduling/public | 5 |
| apps/platform/src/bounded-contexts/scheduling/coach-schedule | apps/platform/src/shared/database | 6 |
| apps/platform/src/bounded-contexts/scheduling/coach-schedule | apps/platform/src/shared/design-system | 2 |
| apps/platform/src/bounded-contexts/scheduling/coach-schedule | apps/platform/src/shared/http | 2 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/access | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/access/accounts | 2 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/access/public | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/clients | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/clients/client-profile | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/legal | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/operations | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/operations/feature-flags | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/programs | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/programs/exercise-library | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/programs/nutrition-library | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/sales | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/sales/shared/payments | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/sales/store | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/sales/waitlist | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/scheduling | 1 |
| apps/platform/src/composition-root | apps/platform/src/bounded-contexts/scheduling/assessment-calls | 1 |
| apps/platform/src/composition-root | apps/platform/src/shared/brand | 1 |
| apps/platform/src/composition-root | apps/platform/src/shared/clock | 1 |
| apps/platform/src/composition-root | apps/platform/src/shared/database | 4 |
| apps/platform/src/composition-root | apps/platform/src/shared/documents | 1 |
| apps/platform/src/composition-root | apps/platform/src/shared/email | 2 |
| apps/platform/src/composition-root | apps/platform/src/shared/http | 2 |
| apps/platform/src/composition-root | apps/platform/src/shared/logging | 1 |
| apps/platform/src/composition-root | apps/platform/src/shared/submission-checks | 4 |
| apps/platform/src/composition-root | apps/platform/src/shared/tokens | 1 |
| apps/platform/src/shared/database | apps/platform/src/shared/http | 1 |
| apps/platform/src/shared/email | apps/platform/src/shared/runtime | 1 |
| apps/platform/src/shared/pwa | apps/platform/src/shared/http | 1 |
| apps/platform/src/shared/submission-checks | apps/platform/src/shared/runtime | 1 |
| apps/platform/src/shared/tokens | apps/platform/src/shared/documents | 2 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/access/accounts | 1 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/access/public | 5 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/clients | 5 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/clients/check-ins | 2 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/clients/client-profile | 5 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/clients/client-resources | 1 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/clients/clients | 2 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/clients/notifications | 1 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/sales | 3 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/bounded-contexts/sales/subscriptions | 4 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/shared/design-system | 5 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/shared/http | 1 |
| apps/platform/src/surfaces/client-portal | apps/platform/src/shared/pwa | 4 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/access/public | 4 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/clients | 7 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/clients/check-ins | 4 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/clients/client-profile | 3 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/clients/client-resources | 3 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/clients/clients | 7 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/clients/notifications | 1 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/programs | 2 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/programs/exercise-library | 1 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/programs/nutrition-library | 1 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/programs/training-programs | 1 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/sales | 2 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/sales/subscriptions | 2 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/scheduling | 4 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/bounded-contexts/scheduling/assessment-calls | 3 |
| apps/platform/src/surfaces/coach-portal | apps/platform/src/shared/design-system | 7 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/access/accounts | 5 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/access/public | 5 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/clients | 1 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/clients/clients | 1 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/legal | 1 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/sales | 3 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/sales/public | 4 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/sales/store | 2 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/sales/subscriptions | 1 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/sales/waitlist | 7 |
| apps/platform/src/surfaces/public-site | apps/platform/src/bounded-contexts/scheduling | 4 |
| apps/platform/src/surfaces/public-site | apps/platform/src/composition-root | 1 |
| apps/platform/src/surfaces/public-site | apps/platform/src/shared/brand | 1 |
| apps/platform/src/surfaces/public-site | apps/platform/src/shared/design-system | 15 |
| apps/platform/src/surfaces/public-site | apps/platform/src/shared/http | 5 |
| apps/platform/src/surfaces/public-site | apps/platform/src/shared/submission-checks | 4 |

## Threshold breaches

- apps/platform/src/shared/design-system: zone of pain
- apps/platform/src/bounded-contexts/clients: zone of pain
- apps/platform/src/shared/brand: zone of pain
- apps/platform/src/shared/clock: zone of pain
- apps/platform/src/shared/email: zone of pain
- apps/platform/src/shared/http: zone of pain
- apps/platform/src/shared/private-files: zone of pain
- apps/platform/src/shared/pwa: zone of pain
- apps/platform/src/shared/time-format: zone of pain
- apps/platform/src/shared/database: distance 0.77 beyond the project threshold
- apps/platform/src/shared/design-system: distance 0.91 beyond the project threshold
- apps/platform/src/bounded-contexts/clients: distance 0.74 beyond the project threshold
- apps/platform/src/shared/brand: distance 1 beyond the project threshold
- apps/platform/src/shared/clock: distance 1 beyond the project threshold
- apps/platform/src/shared/contact: distance 0.75 beyond the project threshold
- apps/platform/src/shared/email: distance 0.9 beyond the project threshold
- apps/platform/src/shared/http: distance 0.89 beyond the project threshold
- apps/platform/src/shared/logging: distance 0.75 beyond the project threshold
- apps/platform/src/shared/private-files: distance 1 beyond the project threshold
- apps/platform/src/shared/pwa: distance 0.88 beyond the project threshold
- apps/platform/src/shared/submission-checks: distance 0.73 beyond the project threshold
- apps/platform/src/shared/time-format: distance 1 beyond the project threshold
