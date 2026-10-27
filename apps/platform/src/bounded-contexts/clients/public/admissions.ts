type CoachingStatusDto = "not-started" | "active" | "cancelled" | "ended";

export type CoachingStandingDto = {
  status: CoachingStatusDto;
  accessEndsAt: string | null;
  refundDue: boolean;
  bundleMonths: number | null;
  programStartsAt: string | null;
  paidThrough: string | null;
};

type PaidClientGender = "female" | "male" | "prefer_not_to_say";

type PaidClientGoal =
  | "lose_weight"
  | "build_muscle"
  | "build_strength"
  | "maintain_improve_lifestyle";

type PaidClientDto = {
  assessmentCallId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: PaidClientGender;
  primaryGoal: PaidClientGoal;
  country: string;
  phone: string | null;
  bookingTimeZone: string;
  admittedAt: string;
  standing: CoachingStandingDto;
};

type PaidClientAdmissionDto =
  | { status: "admitted"; clientId: string }
  | { status: "call_already_has_client" };

type CoachingStandingRecordDto = {
  clientId: string;
  standing: CoachingStandingDto;
};

export interface AdmissionsFacade {
  admitPaidClient(dto: PaidClientDto): Promise<PaidClientAdmissionDto>;
  invitePaidClient(dto: { clientId: string }): Promise<void>;
  recordCoachingStanding(dto: CoachingStandingRecordDto): Promise<void>;
}
