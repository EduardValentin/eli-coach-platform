import { CLIENT_PORTAL_PATH } from "../../accounts/public/paths";

export const CLIENT_PROFILE_ROUTE_SEGMENT = "profile";

export const CLIENT_PROFILE_PATH = `${CLIENT_PORTAL_PATH}/${CLIENT_PROFILE_ROUTE_SEGMENT}`;

export const CLIENT_PROFILE_API_PATHS = {
  unitPreference: "/api/client-profile/unit-preference",
  measurements: "/api/client-profile/measurements",
  photos: "/api/client-profile/photos",
} as const;

export function progressPhotoPath(photoId: string): string {
  return `${CLIENT_PROFILE_API_PATHS.photos}/${encodeURIComponent(photoId)}`;
}
