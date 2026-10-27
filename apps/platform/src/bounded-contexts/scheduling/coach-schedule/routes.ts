import { relative } from "@react-router/dev/routes";

import {
  COACH_SETTINGS_API_PATH,
  COACH_SETTINGS_ROUTE_SEGMENT,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

export const coachScheduleCoachRoutes = [
  route(COACH_SETTINGS_ROUTE_SEGMENT, "./ui/coach/settings-page.tsx"),
];

export const coachScheduleApiRoutes = [
  route(COACH_SETTINGS_API_PATH.slice(1), "./api/settings.ts"),
];
