import { CLIENT_PORTAL_PATH } from "../../accounts/public/paths";

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
