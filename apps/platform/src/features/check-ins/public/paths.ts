import {
  CLIENT_PORTAL_PATH,
  COACH_PORTAL_PATH,
} from "../../accounts/public/paths";

const CHECK_INS_API = "/api/check-ins";

const CHECK_INS_ROUTE_SEGMENT = "checkins";

export const CHECK_INS_API_PATHS = {
  requests: CHECK_INS_API,
  openTimes: `${CHECK_INS_API}/open-times`,
  withdrawal: `${CHECK_INS_API}/:checkInId/withdrawal`,
  approval: `${CHECK_INS_API}/:checkInId/approval`,
  decline: `${CHECK_INS_API}/:checkInId/decline`,
} as const;

export const CHECK_IN_JOIN_ROUTE_SEGMENT = `${CHECK_INS_ROUTE_SEGMENT}/:checkInId/join`;

export const CLIENT_CHECK_INS_PATH = `${CLIENT_PORTAL_PATH}/${CHECK_INS_ROUTE_SEGMENT}`;

export const COACH_CHECK_INS_PATH = `${COACH_PORTAL_PATH}/${CHECK_INS_ROUTE_SEGMENT}`;

export function clientCheckInJoinPath(checkInId: string): string {
  return `${CLIENT_CHECK_INS_PATH}/${encodeURIComponent(checkInId)}/join`;
}
