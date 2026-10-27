import { relative, type RouteConfigEntry } from "@react-router/dev/routes";

import {
  CLIENT_ONBOARDING_API_PATHS,
  CLIENT_ONBOARDING_ROUTE_SEGMENT,
  CLIENT_PROFILE_API_PATHS,
  CLIENT_PROFILE_ROUTE_SEGMENT,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

export const clientProfileClientRoutes: RouteConfigEntry[] = [
  route(CLIENT_PROFILE_ROUTE_SEGMENT, "./ui/client/profile/profile-page.tsx"),
];

export const clientProfileApiRoutes = [
  route(
    CLIENT_PROFILE_API_PATHS.unitPreference.slice(1),
    "./api/client/unit-preference.ts",
  ),
  route(
    CLIENT_PROFILE_API_PATHS.measurements.slice(1),
    "./api/client/measurements.ts",
  ),
  route(
    CLIENT_PROFILE_API_PATHS.ownProfile.slice(1),
    "./api/client/own-profile.ts",
  ),
  route(
    `${CLIENT_PROFILE_API_PATHS.photos.slice(1)}/:photoId`,
    "./api/photos/progress-photo.ts",
  ),
  route(
    CLIENT_PROFILE_API_PATHS.avatars.slice(1),
    "./api/client/own-avatar.ts",
  ),
  route(
    `${CLIENT_PROFILE_API_PATHS.avatars.slice(1)}/:clientId`,
    "./api/avatar/client-avatar.ts",
  ),
  route(
    `${CLIENT_PROFILE_API_PATHS.coachProfiles.slice(1)}/:clientId`,
    "./api/coach/coach-client-profile.ts",
  ),
  route(
    `${CLIENT_PROFILE_API_PATHS.coachProfiles.slice(1)}/:clientId/avatar`,
    "./api/coach/coach-client-avatar.ts",
  ),
];

export const clientOnboardingClientRoutes = [
  route(
    CLIENT_ONBOARDING_ROUTE_SEGMENT,
    "./ui/client/onboarding/onboarding-page.tsx",
  ),
];

export const clientOnboardingApiRoutes = [
  route(
    CLIENT_ONBOARDING_API_PATHS.draft.slice(1),
    "./api/onboarding/client-draft.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.submission.slice(1),
    "./api/onboarding/client-submission.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.detailAnswers.slice(1),
    "./api/onboarding/client-detail-answers.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.reviewOpenings.slice(1),
    "./api/onboarding/coach-review-openings.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.detailRequests.slice(1),
    "./api/onboarding/coach-detail-requests.ts",
  ),
  route(
    CLIENT_ONBOARDING_API_PATHS.approvals.slice(1),
    "./api/onboarding/coach-approvals.ts",
  ),
];
