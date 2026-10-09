import { relative } from "@react-router/dev/routes";

import {
  CHECK_IN_JOIN_ROUTE_SEGMENT,
  CHECK_INS_API_PATHS,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

export const checkInsClientJoinRoutes = [
  route(CHECK_IN_JOIN_ROUTE_SEGMENT, "./ui/client/join/join-page.tsx"),
];

export const checkInsCoachJoinRoutes = [
  route(CHECK_IN_JOIN_ROUTE_SEGMENT, "./ui/coach/join/join-page.tsx"),
];

export const checkInsApiRoutes = [
  route(CHECK_INS_API_PATHS.openTimes.slice(1), "./api/client/open-times.ts"),
  route(CHECK_INS_API_PATHS.requests.slice(1), "./api/client/requests.ts"),
  route(CHECK_INS_API_PATHS.withdrawal.slice(1), "./api/client/withdrawal.ts"),
  route(CHECK_INS_API_PATHS.approval.slice(1), "./api/coach/approval.ts"),
  route(CHECK_INS_API_PATHS.decline.slice(1), "./api/coach/decline.ts"),
];
