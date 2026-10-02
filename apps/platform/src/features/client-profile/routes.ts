import { relative, type RouteConfigEntry } from "@react-router/dev/routes";

import {
  CLIENT_PROFILE_API_PATHS,
  CLIENT_PROFILE_ROUTE_SEGMENT,
} from "./contracts/paths";

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
    `${CLIENT_PROFILE_API_PATHS.photos.slice(1)}/:photoId`,
    "./api/photos/progress-photo.ts",
  ),
];
