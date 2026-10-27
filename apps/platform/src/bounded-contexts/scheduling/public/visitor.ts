export type VisitorGender = "female" | "male" | "prefer_not_to_say";

type VisitorPrimaryGoal =
  | "lose_weight"
  | "build_muscle"
  | "build_strength"
  | "maintain_improve_lifestyle";

export type Visitor = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  notes: string | null;
  dateOfBirth: string;
  gender: VisitorGender;
  primaryGoal: VisitorPrimaryGoal;
  country: string;
  phone: string | null;
  timeZone: string;
};
