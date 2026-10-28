import type { CallerGender, CallerGoal } from "../caller";

import type { CoachingStanding } from "./coaching-standing";

export type PaidClientIntake = {
  assessmentCallId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: CallerGender;
  primaryGoal: CallerGoal;
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
