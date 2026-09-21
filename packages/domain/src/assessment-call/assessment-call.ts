import { ASSESSMENT_CALL_RULES } from "./assessment-call-rules";
import type { VisitorGender, VisitorPrimaryGoal } from "./visitor-profile";

export type AssessmentCallProps = {
  id: string;
  firstName: string;
  lastName: string;
  visitorEmail: string;
  visitorNotes: string | null;
  dateOfBirth: string;
  gender: VisitorGender;
  primaryGoal: VisitorPrimaryGoal;
  country: string;
  phone: string | null;
  startsAt: Date;
  visitorTimeZone: string;
  coachTimeZone: string;
  bookedAt: Date;
};

export type AssessmentCallSnapshot = AssessmentCallProps & {
  endsAt: Date;
  fullName: string;
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
  readonly firstName: string;
  readonly lastName: string;
  readonly visitorEmail: string;
  readonly visitorNotes: string | null;
  readonly dateOfBirth: string;
  readonly gender: VisitorGender;
  readonly primaryGoal: VisitorPrimaryGoal;
  readonly country: string;
  readonly phone: string | null;
  readonly startsAt: Date;
  readonly visitorTimeZone: string;
  readonly coachTimeZone: string;
  readonly bookedAt: Date;

  private constructor(props: AssessmentCallProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.visitorEmail = props.visitorEmail;
    this.visitorNotes = props.visitorNotes;
    this.dateOfBirth = props.dateOfBirth;
    this.gender = props.gender;
    this.primaryGoal = props.primaryGoal;
    this.country = props.country;
    this.phone = props.phone;
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

  fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  hasEnded(now: Date): boolean {
    return this.endsAt() <= now;
  }

  toSnapshot(): AssessmentCallSnapshot {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName(),
      visitorEmail: this.visitorEmail,
      visitorNotes: this.visitorNotes,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      primaryGoal: this.primaryGoal,
      country: this.country,
      phone: this.phone,
      startsAt: this.startsAt,
      endsAt: this.endsAt(),
      visitorTimeZone: this.visitorTimeZone,
      coachTimeZone: this.coachTimeZone,
      bookedAt: this.bookedAt,
    };
  }
}
