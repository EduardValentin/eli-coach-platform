import type { CoachingStanding } from "./coaching-standing";

export type PaidClientIntake = {
  assessmentCallId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: "female" | "male" | "prefer_not_to_say";
  primaryGoal:
    | "lose_weight"
    | "build_muscle"
    | "build_strength"
    | "maintain_improve_lifestyle";
  country: string;
  phone: string | null;
  bookingTimeZone: string;
};

export type PaidClientAdmissionOutcome =
  | { status: "admitted"; clientId: string }
  | { status: "call_already_has_client" };

export interface PaidClientAdmission {
  admit(admission: {
    client: PaidClientIntake;
    standing: CoachingStanding;
    at: Date;
  }): Promise<PaidClientAdmissionOutcome>;
  invite(input: { clientId: string }): Promise<void>;
}
