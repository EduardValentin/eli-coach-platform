import type { PortalReach } from "../client";
import type { SlotPolicy } from "../coach-availability";

export type CheckInSeriesBoundsSnapshot = { from: Date; until: Date };

type CoachingReading = {
  client: {
    portal: PortalReach;
    programStartsAt: Date | null;
    paidThrough: Date | null;
    coachingEndsAt: Date | null;
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

  static ofCoaching({
    client,
    now,
    lead,
  }: CoachingReading):
    CheckInSeriesBounds | "client_cannot_answer" | "nothing_to_create" {
    const { programStartsAt, paidThrough, coachingEndsAt } = client;

    if (
      client.portal !== "reachable" ||
      programStartsAt === null ||
      paidThrough === null
    ) {
      return "client_cannot_answer";
    }

    const paid = new CheckInSeriesBounds({
      from: programStartsAt,
      until: paidThrough,
    }).notBefore(new Date(now.getTime() + lead.leadMilliseconds()));
    const coached =
      coachingEndsAt === null ? paid : paid.notAfter(coachingEndsAt);

    return coached.from < coached.until ? coached : "nothing_to_create";
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

  notAfter(instant: Date): CheckInSeriesBounds {
    return new CheckInSeriesBounds({
      from: this.from,
      until: this.earliestOf(this.until, instant),
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
