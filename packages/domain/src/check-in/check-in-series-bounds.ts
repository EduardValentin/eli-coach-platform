import type { PortalReach } from "../client";
import type { SlotPolicy } from "../coach-availability";

export type CheckInSeriesBoundsSnapshot = { from: Date; until: Date };

type CoachedClient = {
  portal: PortalReach;
  coachingEndsAt: Date | null;
};

type CoachingReading = {
  client: CoachedClient & {
    programStartsAt: Date | null;
    paidThrough: Date | null;
  };
  now: Date;
  lead: SlotPolicy;
};

export class CheckInSeriesBounds {
  readonly from: Date;
  readonly until: Date;

  private constructor(snapshot: CheckInSeriesBoundsSnapshot) {
    this.from = snapshot.from;
    this.until = snapshot.until;
  }

  static of(snapshot: CheckInSeriesBoundsSnapshot): CheckInSeriesBounds {
    return new CheckInSeriesBounds(snapshot);
  }

  static admits(client: CoachedClient): boolean {
    return client.portal === "reachable" && client.coachingEndsAt === null;
  }

  static ofCoaching({
    client,
    now,
    lead,
  }: CoachingReading):
    CheckInSeriesBounds | "client_cannot_answer" | "nothing_to_create" {
    const { programStartsAt, paidThrough } = client;

    if (
      !CheckInSeriesBounds.admits(client) ||
      programStartsAt === null ||
      paidThrough === null
    ) {
      return "client_cannot_answer";
    }

    const paid = new CheckInSeriesBounds({
      from: programStartsAt,
      until: paidThrough,
    }).notBefore(new Date(now.getTime() + lead.leadMilliseconds()));

    return paid.from < paid.until ? paid : "nothing_to_create";
  }

  holds(instant: Date): boolean {
    return this.from <= instant && instant < this.until;
  }

  notBefore(instant: Date): CheckInSeriesBounds {
    return new CheckInSeriesBounds({
      from: this.latestOf(this.from, instant),
      until: this.until,
    });
  }

  spanning(other: CheckInSeriesBounds): CheckInSeriesBounds {
    return new CheckInSeriesBounds({
      from: this.earliestOf(this.from, other.from),
      until: this.latestOf(this.until, other.until),
    });
  }

  toSnapshot(): CheckInSeriesBoundsSnapshot {
    return { from: this.from, until: this.until };
  }

  private latestOf(left: Date, right: Date): Date {
    return left > right ? left : right;
  }

  private earliestOf(left: Date, right: Date): Date {
    return left < right ? left : right;
  }
}
