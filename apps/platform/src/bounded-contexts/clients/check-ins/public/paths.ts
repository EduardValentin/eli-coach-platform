import {
  CLIENT_PORTAL_PATH,
  COACH_PORTAL_PATH,
} from "../../../access/public/paths";

const CHECK_INS_API = "/api/check-ins";

export const CHECK_INS_ROUTE_SEGMENT = "checkins";

export const CHECK_INS_API_PATHS = {
  requests: CHECK_INS_API,
  schedule: `${CHECK_INS_API}/schedule`,
  openTimes: `${CHECK_INS_API}/open-times`,
  withdrawal: `${CHECK_INS_API}/:checkInId/withdrawal`,
  approval: `${CHECK_INS_API}/:checkInId/approval`,
  decline: `${CHECK_INS_API}/:checkInId/decline`,
  newTime: `${CHECK_INS_API}/:checkInId/new-time`,
  cancellation: `${CHECK_INS_API}/:checkInId/cancellation`,
  series: `${CHECK_INS_API}/series`,
  seriesPreview: `${CHECK_INS_API}/series/preview`,
  seriesChange: `${CHECK_INS_API}/series/:seriesId`,
  seriesStop: `${CHECK_INS_API}/series/:seriesId/stop`,
} as const;

export const CHECK_IN_JOIN_ROUTE_SEGMENT = `${CHECK_INS_ROUTE_SEGMENT}/:checkInId/join`;

export const CLIENT_CHECK_INS_PATH = `${CLIENT_PORTAL_PATH}/${CHECK_INS_ROUTE_SEGMENT}`;

export const COACH_CHECK_INS_PATH = `${COACH_PORTAL_PATH}/${CHECK_INS_ROUTE_SEGMENT}`;

export const CHECK_IN_FOCUS_PARAM = "checkin";

export function clientCheckInJoinPath(checkInId: string): string {
  return `${CLIENT_CHECK_INS_PATH}/${encodeURIComponent(checkInId)}/join`;
}

export function clientCheckInPath(checkInId: string): string {
  return `${CLIENT_CHECK_INS_PATH}?${CHECK_IN_FOCUS_PARAM}=${encodeURIComponent(checkInId)}`;
}

export function coachCheckInPath(checkInId: string): string {
  return `${COACH_CHECK_INS_PATH}?${CHECK_IN_FOCUS_PARAM}=${encodeURIComponent(checkInId)}`;
}

export function coachCheckInJoinPath(checkInId: string): string {
  return `${COACH_CHECK_INS_PATH}/${encodeURIComponent(checkInId)}/join`;
}
