export type Gender = "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";

/**
 * Mifflin-St Jeor defines a constant for two of the four genders only, so the
 * coach picks one of these when onboarding. The client sets her fuller identity
 * gender during her own onboarding without disturbing the stored figures.
 */
export type MetabolicSex = Extract<Gender, "FEMALE" | "MALE">;

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHTLY_ACTIVE"
  | "MODERATELY_ACTIVE"
  | "VERY_ACTIVE";

export type GoalType =
  | "MUSCLE_BUILDING"
  | "FAT_LOSS"
  | "STRENGTH"
  | "RECOMPOSITION"
  | "MAINTENANCE"
  | "CUSTOM";

export type GoalStatus = "ACTIVE" | "COMPLETED";

/**
 * Which way a goal is allowed to move the client's weight. A fat-loss target
 * cannot sit above her current weight and a muscle-building target cannot sit
 * below it; maintenance and recomposition hold or drift down, never up.
 */
export type WeightDirection = "DOWN" | "UP" | "EITHER";

export const WEIGHT_DIRECTION_BY_GOAL: Record<GoalType, WeightDirection> = {
  FAT_LOSS: "DOWN",
  MAINTENANCE: "DOWN",
  RECOMPOSITION: "DOWN",
  MUSCLE_BUILDING: "UP",
  STRENGTH: "UP",
  CUSTOM: "EITHER",
};

export type MacroSplit = {
  proteinPercent: number;
  carbsPercent: number;
  fatsPercent: number;
};

export type ClientMeasurements = {
  activityLevel: ActivityLevel;
  heightCm: number;
  weightKg: number;
};

export type OnboardedClient = {
  clientId: string;
  invitationExpiresAt: Date;
  profileId: string;
  replacedPendingInvitation: boolean;
};
