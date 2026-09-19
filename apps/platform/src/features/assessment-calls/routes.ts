import { relative } from "@react-router/dev/routes";

import {
  ASSESSMENT_CALL_API_PATHS,
  BOOK_ROUTE_SEGMENT,
} from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const assessmentCallsPublicRoutes = [
  route(BOOK_ROUTE_SEGMENT, "./ui/public/book/book-page.tsx"),
  route(
    `${BOOK_ROUTE_SEGMENT}/:bookingId/join`,
    "./ui/public/join/join-page.tsx",
  ),
];

export const assessmentCallsApiRoutes = [
  route(ASSESSMENT_CALL_API_PATHS.slots.slice(1), "./api/slots.ts"),
  route(ASSESSMENT_CALL_API_PATHS.bookings.slice(1), "./api/bookings.ts"),
];
