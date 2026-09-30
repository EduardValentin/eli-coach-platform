import { relative } from "@react-router/dev/routes";

import { CLIENT_PROFILE_API_PATHS } from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const clientProfileApiRoutes = [
  route(
    CLIENT_PROFILE_API_PATHS.unitPreference.slice(1),
    "./api/client/unit-preference.ts",
  ),
];
