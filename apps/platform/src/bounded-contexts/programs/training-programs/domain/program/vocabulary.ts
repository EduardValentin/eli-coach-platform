export const CLIENT_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ClientLevel = (typeof CLIENT_LEVELS)[number];

export const PROGRAM_LANGUAGES = ["en", "ro"] as const;
export type ProgramLanguage = (typeof PROGRAM_LANGUAGES)[number];

export const BLOCK_TYPES = [
  "foundation",
  "hypertrophy",
  "strength",
  "deload",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  foundation: "Foundation",
  hypertrophy: "Hypertrophy",
  strength: "Strength",
  deload: "Deload",
};

export const SPLIT_SHAPES = ["full-body", "upper-lower"] as const;
export type SplitShape = (typeof SPLIT_SHAPES)[number];

export const WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const TRAINING_DAY_OPTIONS = [2, 3, 4, 5] as const;
export type TrainingDays = (typeof TRAINING_DAY_OPTIONS)[number];

export const SESSION_MINUTE_OPTIONS = [30, 45, 60] as const;
export type SessionMinutes = (typeof SESSION_MINUTE_OPTIONS)[number];

export const DEFAULT_DAILY_STEPS = 6000;
const DAILY_STEPS_STEP = 1000;
const DAILY_STEPS_MIN = 4000;
const DAILY_STEPS_MAX = 12000;
export const DAILY_STEP_TARGETS: readonly number[] = Array.from(
  { length: (DAILY_STEPS_MAX - DAILY_STEPS_MIN) / DAILY_STEPS_STEP + 1 },
  (_, index) => DAILY_STEPS_MIN + index * DAILY_STEPS_STEP,
);

export const VERSION_STATUSES = ["draft", "published", "superseded"] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];
