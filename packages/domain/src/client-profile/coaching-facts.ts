import type { ClientPreferences } from "../client-settings";
import { WEIGHT_MEASUREMENT_FIELD } from "../measurement";

export const CLIENT_EQUIPMENT = [
  "Full gym",
  "Machines",
  "Barbell",
  "Dumbbells",
  "Kettlebells",
  "Resistance bands",
  "Bodyweight only",
] as const;

export type ClientEquipment = (typeof CLIENT_EQUIPMENT)[number];

export const BODYWEIGHT_ONLY: ClientEquipment = "Bodyweight only";

export const TRAINING_PLACES = ["Home", "Gym", "Both"] as const;

type TrainingPlace = (typeof TRAINING_PLACES)[number];

export const CLIENT_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type ClientLevel = (typeof CLIENT_LEVELS)[number];

export const ACTIVITY_LEVELS = [
  "Mostly sitting",
  "Lightly active",
  "Active",
  "Very active",
] as const;

type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const CYCLE_MODES = ["adapted", "general"] as const;

export type CycleMode = (typeof CYCLE_MODES)[number];

export const TRAINING_DAY_OPTIONS = [2, 3, 4, 5] as const;

export type TrainingDays = (typeof TRAINING_DAY_OPTIONS)[number];

export const SESSION_MINUTE_OPTIONS = [30, 45, 60] as const;

export type SessionMinutes = (typeof SESSION_MINUTE_OPTIONS)[number];

export const HEIGHT_RANGE_CM = { min: 120, max: 230 } as const;

const GOAL_WEIGHT_RANGE_KG = WEIGHT_MEASUREMENT_FIELD.range;

const MAX_LIMITATIONS_LENGTH = 500;

const NO_DIETARY_RESTRICTIONS = "None";

export type CoachingFactsSnapshot = {
  heightCm: number | null;
  trainingDays: TrainingDays;
  sessionMinutes: SessionMinutes;
  equipment: ClientEquipment[];
  trainingPlace: TrainingPlace | null;
  limitations: string;
  level: ClientLevel;
  primaryGoal: string | null;
  goalWeightKg: number | null;
  activityLevel: ActivityLevel | null;
  cycleMode: CycleMode;
  dietaryRestrictions: string;
};

export type SharedCoachingFacts = Pick<
  CoachingFactsSnapshot,
  | "heightCm"
  | "trainingDays"
  | "sessionMinutes"
  | "equipment"
  | "trainingPlace"
  | "limitations"
>;

export type CoachingSeed = {
  coaching: CoachingFactsSnapshot;
  preferences: ClientPreferences;
};

export type CoachingFactsProblems = {
  heightCm?: "out-of-range";
  goalWeightKg?: "out-of-range";
  equipment?: "exclusive";
  limitations?: "too-long";
  dietaryRestrictions?: "missing";
};

export type CoachingFactsResult =
  | { status: "valid"; facts: CoachingFacts }
  | { status: "invalid"; problems: CoachingFactsProblems };

type Range = { min: number; max: number };

export class CoachingFacts {
  private constructor(private readonly snapshot: CoachingFactsSnapshot) {}

  static of(entered: CoachingFactsSnapshot): CoachingFactsResult {
    const facts = new CoachingFacts({
      ...entered,
      equipment: [...new Set(entered.equipment)],
      limitations: entered.limitations.trim(),
      primaryGoal: entered.primaryGoal?.trim() || null,
      dietaryRestrictions: entered.dietaryRestrictions.trim(),
    });
    const problems = facts.problems();

    return Object.keys(problems).length > 0
      ? { status: "invalid", problems }
      : { status: "valid", facts };
  }

  static seeded(answered: CoachingFactsSnapshot): CoachingFacts {
    return new CoachingFacts(answered).withinRules();
  }

  toSnapshot(): CoachingFactsSnapshot {
    return { ...this.snapshot, equipment: [...this.snapshot.equipment] };
  }

  private problems(): CoachingFactsProblems {
    const { heightCm, goalWeightKg, limitations, dietaryRestrictions } =
      this.snapshot;

    return {
      ...(!this.isWithin(heightCm, HEIGHT_RANGE_CM) && {
        heightCm: "out-of-range",
      }),
      ...(!this.isWithin(goalWeightKg, GOAL_WEIGHT_RANGE_KG) && {
        goalWeightKg: "out-of-range",
      }),
      ...(this.mixesBodyweightOnly() && { equipment: "exclusive" }),
      ...(limitations.length > MAX_LIMITATIONS_LENGTH && {
        limitations: "too-long",
      }),
      ...(dietaryRestrictions.length === 0 && {
        dietaryRestrictions: "missing",
      }),
    };
  }

  private withinRules(): CoachingFacts {
    const { heightCm, goalWeightKg, equipment } = this.snapshot;

    return new CoachingFacts({
      ...this.snapshot,
      heightCm: this.isWithin(heightCm, HEIGHT_RANGE_CM) ? heightCm : null,
      goalWeightKg: this.isWithin(goalWeightKg, GOAL_WEIGHT_RANGE_KG)
        ? goalWeightKg
        : null,
      equipment: this.mixesBodyweightOnly()
        ? equipment.filter((item) => item !== BODYWEIGHT_ONLY)
        : [...new Set(equipment)],
      limitations: this.snapshot.limitations
        .trim()
        .slice(0, MAX_LIMITATIONS_LENGTH),
      dietaryRestrictions:
        this.snapshot.dietaryRestrictions.trim() || NO_DIETARY_RESTRICTIONS,
    });
  }

  private isWithin(value: number | null, range: Range): boolean {
    return value === null || (value >= range.min && value <= range.max);
  }

  private mixesBodyweightOnly(): boolean {
    const { equipment } = this.snapshot;

    return equipment.includes(BODYWEIGHT_ONLY) && equipment.length > 1;
  }
}
