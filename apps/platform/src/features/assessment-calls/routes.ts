import { relative } from "@react-router/dev/routes";

import { ASSESSMENT_CALL_API_PATHS, BOOK_ROUTE_SEGMENT } from "./public/paths";

const { route } = relative(import.meta.dirname);

export const assessmentCallsBookingRoutes = [
  route(BOOK_ROUTE_SEGMENT, "./ui/public/book/book-page.tsx"),
];

export const assessmentCallsJoinRoutes = [
  route(
    `${BOOK_ROUTE_SEGMENT}/:bookingId/join`,
    "./ui/public/join/join-page.tsx",
  ),
];

export const assessmentCallsApiRoutes = [
  route(ASSESSMENT_CALL_API_PATHS.slots.slice(1), "./api/booking/slots.ts"),
  route(
    ASSESSMENT_CALL_API_PATHS.bookings.slice(1),
    "./api/booking/bookings.ts",
  ),
];
