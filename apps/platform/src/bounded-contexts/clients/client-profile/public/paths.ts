import { CLIENT_PORTAL_PATH } from "../../../access/public/paths";

export { CLIENT_ONBOARDING_ROUTE_SEGMENT } from "../../clients/public/paths";

export const CLIENT_PROFILE_ROUTE_SEGMENT = "profile";

export const CLIENT_PROFILE_PATH = `${CLIENT_PORTAL_PATH}/${CLIENT_PROFILE_ROUTE_SEGMENT}`;

export const CLIENT_PROFILE_API_PATHS = {
  unitPreference: "/api/client-profile/unit-preference",
  measurements: "/api/client-profile/measurements",
  photos: "/api/client-profile/photos",
  ownProfile: "/api/client-profile/profile",
  avatars: "/api/client-profile/avatar",
  coachProfiles: "/api/client-profile/coach",
} as const;

export function progressPhotoPath(photoId: string): string {
  return `${CLIENT_PROFILE_API_PATHS.photos}/${encodeURIComponent(photoId)}`;
}

export function clientAvatarPath(avatar: {
  clientId: string;
  avatarId: string;
}): string {
  return `${CLIENT_PROFILE_API_PATHS.avatars}/${encodeURIComponent(avatar.clientId)}?v=${encodeURIComponent(avatar.avatarId)}`;
}

export function coachClientProfileApiPath(clientId: string): string {
  return `${CLIENT_PROFILE_API_PATHS.coachProfiles}/${encodeURIComponent(clientId)}`;
}

export function coachClientAvatarApiPath(clientId: string): string {
  return `${coachClientProfileApiPath(clientId)}/avatar`;
}

export const CLIENT_ONBOARDING_API_PATHS = {
  draft: "/api/client-onboarding/draft",
  submission: "/api/client-onboarding/submission",
  reviewOpenings: "/api/client-onboarding/review-openings",
  detailRequests: "/api/client-onboarding/detail-requests",
  approvals: "/api/client-onboarding/approvals",
  detailAnswers: "/api/client-onboarding/detail-answers",
} as const;
