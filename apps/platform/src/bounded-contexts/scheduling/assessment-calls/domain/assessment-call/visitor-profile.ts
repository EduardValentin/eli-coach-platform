export const VISITOR_GENDERS = ["female", "male", "prefer_not_to_say"] as const;

export type VisitorGender = (typeof VISITOR_GENDERS)[number];

export const VISITOR_PRIMARY_GOALS = [
  "lose_weight",
  "build_muscle",
  "build_strength",
  "maintain_improve_lifestyle",
] as const;

export type VisitorPrimaryGoal = (typeof VISITOR_PRIMARY_GOALS)[number];

export const MIN_BOOKING_AGE = 18;

export const MAX_BOOKING_AGE = 120;

export const MAX_VISITOR_NAME_LENGTH = 60;
