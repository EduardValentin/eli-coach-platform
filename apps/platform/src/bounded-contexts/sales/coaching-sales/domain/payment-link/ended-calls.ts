type CallerGender = "female" | "male" | "prefer_not_to_say";

type CallerGoal =
  | "lose_weight"
  | "build_muscle"
  | "build_strength"
  | "maintain_improve_lifestyle";

export type SalesCall = {
  id: string;
  firstName: string;
  lastName: string;
  visitorEmail: string;
  dateOfBirth: string;
  gender: CallerGender;
  primaryGoal: CallerGoal;
  country: string;
  phone: string | null;
  visitorTimeZone: string;
  endsAt: Date;
};

export interface EndedCalls {
  findById(callId: string): Promise<SalesCall | null>;
}
