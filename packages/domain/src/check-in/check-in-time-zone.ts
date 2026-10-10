export type CheckInTimeZoneResult =
  { status: "valid"; timeZone: CheckInTimeZone } | { status: "invalid" };

const OFFSET_ZONE_SIGNS = ["+", "-"];

export class CheckInTimeZone {
  private constructor(readonly name: string) {}

  static from(candidate: string): CheckInTimeZoneResult {
    try {
      const { timeZone } = new Intl.DateTimeFormat(undefined, {
        timeZone: candidate,
      }).resolvedOptions();

      return OFFSET_ZONE_SIGNS.includes(timeZone.charAt(0))
        ? { status: "invalid" }
        : { status: "valid", timeZone: new CheckInTimeZone(timeZone) };
    } catch {
      return { status: "invalid" };
    }
  }
}
