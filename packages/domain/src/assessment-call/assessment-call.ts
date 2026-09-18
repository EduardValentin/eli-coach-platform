import { ASSESSMENT_CALL_RULES } from "../coach-availability";

export type AssessmentCallProps = {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorNotes: string | null;
  startsAt: Date;
  visitorTimeZone: string;
  coachTimeZone: string;
  bookedAt: Date;
};

export type AssessmentCallSnapshot = AssessmentCallProps & {
  endsAt: Date;
};

export type ReservationDecision =
  | { decision: "reserve" }
  | { decision: "slot_taken"; existing: AssessmentCall }
  | { decision: "email_has_upcoming_call"; existing: AssessmentCall };

const MILLISECONDS_PER_MINUTE = 60_000;
const DURATION_MS =
  ASSESSMENT_CALL_RULES.durationMinutes * MILLISECONDS_PER_MINUTE;

export class AssessmentCall {
  readonly id: string;
  readonly visitorName: string;
  readonly visitorEmail: string;
  readonly visitorNotes: string | null;
  readonly startsAt: Date;
  readonly visitorTimeZone: string;
  readonly coachTimeZone: string;
  readonly bookedAt: Date;

  private constructor(props: AssessmentCallProps) {
    this.id = props.id;
    this.visitorName = props.visitorName;
    this.visitorEmail = props.visitorEmail;
    this.visitorNotes = props.visitorNotes;
    this.startsAt = props.startsAt;
    this.visitorTimeZone = props.visitorTimeZone;
    this.coachTimeZone = props.coachTimeZone;
    this.bookedAt = props.bookedAt;
  }

  static reconstitute(props: AssessmentCallProps): AssessmentCall {
    return new AssessmentCall(props);
  }

  static decideReservation(input: {
    slotHolder: AssessmentCall | null;
    upcomingCallForEmail: AssessmentCall | null;
  }): ReservationDecision {
    if (input.slotHolder) {
      return { decision: "slot_taken", existing: input.slotHolder };
    }

    if (input.upcomingCallForEmail) {
      return {
        decision: "email_has_upcoming_call",
        existing: input.upcomingCallForEmail,
      };
    }

    return { decision: "reserve" };
  }

  endsAt(): Date {
    return new Date(this.startsAt.getTime() + DURATION_MS);
  }

  isUpcoming(now: Date): boolean {
    return this.startsAt.getTime() > now.getTime();
  }

  isHeldBy(normalizedEmail: string): boolean {
    return this.visitorEmail === normalizedEmail;
  }

  toSnapshot(): AssessmentCallSnapshot {
    return {
      id: this.id,
      visitorName: this.visitorName,
      visitorEmail: this.visitorEmail,
      visitorNotes: this.visitorNotes,
      startsAt: this.startsAt,
      endsAt: this.endsAt(),
      visitorTimeZone: this.visitorTimeZone,
      coachTimeZone: this.coachTimeZone,
      bookedAt: this.bookedAt,
    };
  }
}
