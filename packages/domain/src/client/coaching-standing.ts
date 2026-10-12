export const COACHING_STATUSES = [
  "not-started",
  "active",
  "cancelled",
  "ended",
] as const;

export type CoachingStatus = (typeof COACHING_STATUSES)[number];

export type CoachingStandingSnapshot = {
  status: CoachingStatus;
  accessEndsAt: Date | null;
  refundDue: boolean;
};

export class CoachingStanding {
  readonly status: CoachingStatus;
  readonly accessEndsAt: Date | null;
  readonly refundDue: boolean;

  private constructor(snapshot: CoachingStandingSnapshot) {
    this.status = snapshot.status;
    this.accessEndsAt = snapshot.accessEndsAt;
    this.refundDue = snapshot.refundDue;
  }

  static of(snapshot: CoachingStandingSnapshot): CoachingStanding {
    return new CoachingStanding(snapshot);
  }

  at(now: Date): CoachingStatus {
    const accessHasEnded =
      this.accessEndsAt !== null &&
      now.getTime() >= this.accessEndsAt.getTime();

    if (this.status === "cancelled" && accessHasEnded) {
      return "ended";
    }

    return this.status;
  }

  isCancelledOrEnded(): boolean {
    return this.status === "cancelled" || this.status === "ended";
  }

  coachingEndsAt(): Date | null {
    return this.isCancelledOrEnded() ? this.accessEndsAt : null;
  }

  hasPortalAccessAt(now: Date): boolean {
    return this.at(now) !== "ended";
  }

  toSnapshot(): CoachingStandingSnapshot {
    return {
      status: this.status,
      accessEndsAt: this.accessEndsAt,
      refundDue: this.refundDue,
    };
  }
}
