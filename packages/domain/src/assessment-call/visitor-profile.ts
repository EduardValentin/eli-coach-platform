export const VISITOR_GENDERS = [
  "female",
  "male",
  "non_binary",
  "prefer_not_to_say",
] as const;

export type VisitorGender = (typeof VISITOR_GENDERS)[number];

export const VISITOR_PRIMARY_GOALS = [
  "lose_weight",
  "build_muscle",
  "build_strength",
  "maintain_improve_lifestyle",
] as const;

export type VisitorPrimaryGoal = (typeof VISITOR_PRIMARY_GOALS)[number];
