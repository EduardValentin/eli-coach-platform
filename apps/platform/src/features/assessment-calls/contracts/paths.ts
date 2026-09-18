export const BOOK_ROUTE_SEGMENT = "book";

export const BOOK_PATH = `/${BOOK_ROUTE_SEGMENT}`;

export const ASSESSMENT_CALL_API_PATHS = {
  bookings: "/api/assessment-calls",
  slots: "/api/assessment-calls/slots",
} as const;

export function assessmentCallJoinPath(bookingId: string): string {
  return `${BOOK_PATH}/${bookingId}/join`;
}
