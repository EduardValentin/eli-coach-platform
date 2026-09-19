import { COACH_PORTAL_PATH } from "../../accounts/contracts/paths";

export const BOOK_ROUTE_SEGMENT = "book";

export const BOOK_PATH = `/${BOOK_ROUTE_SEGMENT}`;

export const ASSESSMENT_CALL_API_PATHS = {
  bookings: "/api/assessment-calls",
  slots: "/api/assessment-calls/slots",
} as const;

export function assessmentCallJoinPath(bookingId: string): string {
  return `${BOOK_PATH}/${bookingId}/join`;
}

export const COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT = "assessment-calls";

export const COACH_ASSESSMENT_CALLS_PATH = `${COACH_PORTAL_PATH}/${COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT}`;
