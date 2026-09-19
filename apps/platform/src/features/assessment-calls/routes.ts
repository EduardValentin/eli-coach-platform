import { relative } from "@react-router/dev/routes";

import {
  ASSESSMENT_CALL_API_PATHS,
  BOOK_ROUTE_SEGMENT,
  COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT,
  COACH_SETTINGS_ROUTE_SEGMENT,
} from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const assessmentCallsPublicRoutes = [
  route(BOOK_ROUTE_SEGMENT, "./ui/public/book/book-page.tsx"),
];

export const assessmentCallsJoinRoutes = [
  route(
    `${BOOK_ROUTE_SEGMENT}/:bookingId/join`,
    "./ui/public/join/join-page.tsx",
  ),
];

export const assessmentCallsCoachRoutes = [
  route(
    COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT,
    "./ui/coach/assessment-calls/assessment-calls-page.tsx",
  ),
  route(COACH_SETTINGS_ROUTE_SEGMENT, "./ui/coach/settings/settings-page.tsx"),
];

export const assessmentCallsApiRoutes = [
  route(ASSESSMENT_CALL_API_PATHS.slots.slice(1), "./api/booking/slots.ts"),
  route(
    ASSESSMENT_CALL_API_PATHS.bookings.slice(1),
    "./api/booking/bookings.ts",
  ),
  route(
    ASSESSMENT_CALL_API_PATHS.settings.slice(1),
    "./api/settings/settings.ts",
  ),
];
