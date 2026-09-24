const COACH_CHECKINS_PATH = '/coach/checkins';
const CHECKIN_PARAM = 'checkin';

export function coachCheckinsPath(): string {
  return COACH_CHECKINS_PATH;
}

export function coachCheckinPath(checkinId: string): string {
  return `${COACH_CHECKINS_PATH}?${CHECKIN_PARAM}=${encodeURIComponent(checkinId)}`;
}

export function checkinIdFromSearch(search: URLSearchParams): string | null {
  return search.get(CHECKIN_PARAM);
}

export function checkinAnchorId(checkinId: string): string {
  return `checkin-${checkinId}`;
}
