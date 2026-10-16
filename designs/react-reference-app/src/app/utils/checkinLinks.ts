const COACH_CHECKINS_PATH = '/coach/checkins';
export const CLIENT_CHECKINS_PATH = '/portal/checkins';
const CHECKIN_PARAM = 'checkin';
export const CHECKIN_KIND_PARAM = 'kind';
export const CHECKIN_QUERY_PARAM = 'q';

export function coachCheckinsPath(): string {
  return COACH_CHECKINS_PATH;
}

export function coachCheckinPath(checkinId: string): string {
  return `${COACH_CHECKINS_PATH}?${CHECKIN_PARAM}=${encodeURIComponent(checkinId)}`;
}

export function clientCheckinPath(checkinId: string): string {
  return `${CLIENT_CHECKINS_PATH}?${CHECKIN_PARAM}=${encodeURIComponent(checkinId)}`;
}

export function checkinIdFromSearch(search: URLSearchParams): string | null {
  return search.get(CHECKIN_PARAM);
}

export function withoutCheckinTarget(search: URLSearchParams): void {
  search.delete(CHECKIN_PARAM);
}

export function checkinAnchorId(checkinId: string): string {
  return `checkin-${checkinId}`;
}
