import { relative } from "@react-router/dev/routes";

import {
  CLIENT_ONBOARDING_API_PATHS,
  CLIENT_ONBOARDING_ROUTE_SEGMENT,
} from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const clientOnboardingClientRoutes = [
  route(
    CLIENT_ONBOARDING_ROUTE_SEGMENT,
    "./ui/client/onboarding/onboarding-page.tsx",
  ),
];

export const clientOnboardingApiRoutes = [
  route(CLIENT_ONBOARDING_API_PATHS.draft.slice(1), "./api/client/draft.ts"),
  route(
    CLIENT_ONBOARDING_API_PATHS.submission.slice(1),
    "./api/client/submission.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.unitPreference.slice(1),
    "./api/client/unit-preference.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.detailAnswers.slice(1),
    "./api/client/detail-answers.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.reviewOpenings.slice(1),
    "./api/coach/review-openings.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.detailRequests.slice(1),
    "./api/coach/detail-requests.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.approvals.slice(1),
    "./api/coach/approvals.ts",
  ),
];
