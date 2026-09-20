import { ASSESSMENT_CALL_RULES } from "./assessment-call-rules";

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

export type CoachTimeOutcome = "reserved" | "taken";

export type ReservationDecision =
  | { status: "reserved" }
  | { status: "slot_taken" }
  | { status: "email_has_upcoming_call" };

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
    coachTime: CoachTimeOutcome;
    upcomingCallForEmail: AssessmentCall | null;
  }): ReservationDecision {
    if (input.coachTime === "taken") {
      return { status: "slot_taken" };
    }

    if (input.upcomingCallForEmail) {
      return { status: "email_has_upcoming_call" };
    }

    return { status: "reserved" };
  }

  endsAt(): Date {
    return new Date(this.startsAt.getTime() + DURATION_MS);
  }

  hasEnded(now: Date): boolean {
    return this.endsAt() <= now;
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
