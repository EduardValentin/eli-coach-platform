export type CoachMeetingRoomResult =
  | { status: "set"; room: CoachMeetingRoom }
  | { status: "unset" }
  | { status: "invalid" };

const MAX_URL_LENGTH = 2048;

export class CoachMeetingRoom {
  private constructor(readonly url: string) {}

  static from(raw: string | null): CoachMeetingRoomResult {
    const trimmed = (raw ?? "").trim();

    if (trimmed.length === 0) {
      return { status: "unset" };
    }

    if (!isAbsoluteHttpsUrl(trimmed)) {
      return { status: "invalid" };
    }

    return { status: "set", room: new CoachMeetingRoom(trimmed) };
  }
}

function isAbsoluteHttpsUrl(candidate: string): boolean {
  if (candidate.length > MAX_URL_LENGTH) {
    return false;
  }

  try {
    return new URL(candidate).protocol === "https:";
  } catch {
    return false;
  }
}
