import {
  ACTIVITY_LEVELS,
  BODYWEIGHT_ONLY,
  CLIENT_EQUIPMENT,
  CLIENT_LEVELS,
  CYCLE_MODES,
  HEIGHT_RANGE_CM,
  PRIMARY_GOALS,
  SESSION_MINUTE_OPTIONS,
  TRAINING_DAY_OPTIONS,
  TRAINING_PLACES,
  type ClientLevel,
  type CycleMode,
  type SessionMinutes,
  type TrainingDays,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { ClientProfileProblems } from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import {
  CANONICAL_MEASURE_UNITS,
  measureUnitLabel,
  toCanonicalMeasure,
  toDisplayMeasure,
  type MeasureKind,
  type MeasureUnits,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import { WEIGHT_MEASUREMENT_FIELD } from "~/bounded-contexts/clients/client-profile/domain/measurement";
import { z } from "zod";

import type { ClientProfileView } from "~/bounded-contexts/clients/client-profile/public/client-profile";

export type ProfileFieldOption = { value: string; label: string };

type ProfileFieldRange = { min: number; max: number };

type ProfileMeasureKind = "height" | "weight";

export type ProfileField = {
  id: string;
  label: string;
  kind:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "radio"
    | "chips"
    | "checkbox"
    | MeasureKind;
  requirement: "required" | "optional";
  options?: readonly ProfileFieldOption[];
  exclusiveOptions?: readonly string[];
  maxLength?: number;
  placeholder?: string;
  hint?: string;
  range?: ProfileFieldRange;
  step?: string;
  unitSuffix?: string;
  reassurance?: { value: string; text: string };
};

type ProfileFieldValues = Record<string, string | string[]>;

type ProfileTextField = ProfileField & {
  kind: Exclude<ProfileField["kind"], "chips">;
};

export const TICKED = "true";

export const UNTICKED = "false";

const MEASURE_KINDS: readonly string[] = ["weight", "height", "circumference"];

export const MAX_PROFILE_NAME_LENGTH = 60;

const MAX_PROFILE_NOTE_LENGTH = 500;

const TRAINING_DAY_LABELS: Record<TrainingDays, string> = {
  2: "2 days",
  3: "3 days",
  4: "4 days",
  5: "5+ days",
};

const SESSION_MINUTE_LABELS: Record<SessionMinutes, string> = {
  30: "30 min",
  45: "45 min",
  60: "60 min",
};

export const CLIENT_LEVEL_LABELS: Record<ClientLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const CYCLE_MODE_LABELS: Record<CycleMode, string> = {
  adapted: "Adapted to symptoms",
  general: "General",
};

const REQUIRED_MESSAGES: Partial<Record<ProfileField["kind"], string>> = {
  radio: "Choose one option.",
  select: "Choose one option.",
  chips: "Choose at least one option.",
};

const TEXT_REQUIRED_MESSAGE = "Enter an answer.";

const AMOUNT_NOUNS: Record<ProfileMeasureKind, string> = {
  height: "a height",
  weight: "a weight",
};

function options(values: readonly string[]): ProfileFieldOption[] {
  return values.map((value) => ({ value, label: value }));
}

function labelledOptions<Value extends string | number>(
  values: readonly Value[],
  labels: Record<Value, string>,
): ProfileFieldOption[] {
  return values.map((value) => ({
    value: String(value),
    label: labels[value],
  }));
}

export const COACHING_FIELDS = {
  height: {
    id: "height",
    label: "Height",
    kind: "height",
    requirement: "required",
    range: HEIGHT_RANGE_CM,
  },
  trainingDays: {
    id: "trainingDays",
    label: "Training days per week",
    kind: "radio",
    requirement: "required",
    options: labelledOptions(TRAINING_DAY_OPTIONS, TRAINING_DAY_LABELS),
  },
  sessionMinutes: {
    id: "sessionMinutes",
    label: "Minutes per session",
    kind: "radio",
    requirement: "required",
    options: labelledOptions(SESSION_MINUTE_OPTIONS, SESSION_MINUTE_LABELS),
  },
  equipment: {
    id: "equipment",
    label: "Equipment",
    kind: "chips",
    requirement: "required",
    options: options(CLIENT_EQUIPMENT),
    exclusiveOptions: [BODYWEIGHT_ONLY],
  },
  trainingPlace: {
    id: "trainingPlace",
    label: "Training place",
    kind: "radio",
    requirement: "required",
    options: options(TRAINING_PLACES),
  },
  limitations: {
    id: "limitations",
    label: "Limitations",
    kind: "textarea",
    requirement: "optional",
    maxLength: MAX_PROFILE_NOTE_LENGTH,
    placeholder: "Injuries or pain to train around",
  },
  level: {
    id: "level",
    label: "Level",
    kind: "radio",
    requirement: "required",
    options: labelledOptions(CLIENT_LEVELS, CLIENT_LEVEL_LABELS),
  },
  primaryGoal: {
    id: "primaryGoal",
    label: "Primary goal",
    kind: "select",
    requirement: "required",
    options: options(PRIMARY_GOALS),
  },
  goalWeight: {
    id: "goalWeight",
    label: "Goal weight",
    kind: "weight",
    requirement: "required",
    range: WEIGHT_MEASUREMENT_FIELD.range,
  },
  activityLevel: {
    id: "activityLevel",
    label: "Lifestyle activity level",
    kind: "select",
    requirement: "required",
    options: options(ACTIVITY_LEVELS),
  },
  cycleMode: {
    id: "cycleMode",
    label: "Cycle mode",
    kind: "radio",
    requirement: "required",
    options: labelledOptions(CYCLE_MODES, CYCLE_MODE_LABELS),
  },
  dietaryRestrictions: {
    id: "dietaryRestrictions",
    label: "Dietary restrictions",
    kind: "text",
    requirement: "required",
  },
  coachNotes: {
    id: "coachNotes",
    label: "Coach notes",
    kind: "textarea",
    requirement: "optional",
    maxLength: MAX_PROFILE_NOTE_LENGTH,
    hint: "Only you see these.",
  },
} as const satisfies Record<string, ProfileField>;

export const SHARED_FACT_FIELDS = [
  COACHING_FIELDS.height,
  COACHING_FIELDS.trainingDays,
  COACHING_FIELDS.sessionMinutes,
  COACHING_FIELDS.equipment,
  COACHING_FIELDS.trainingPlace,
  COACHING_FIELDS.limitations,
] as const;

export type SharedFactValues = {
  height: string;
  trainingDays: string;
  sessionMinutes: string;
  equipment: string[];
  trainingPlace: string;
  limitations: string;
};

type CoachingFactsView = NonNullable<ClientProfileView["coaching"]>;

type SharedFactsView = Pick<
  CoachingFactsView,
  | "heightCm"
  | "trainingDays"
  | "sessionMinutes"
  | "equipment"
  | "trainingPlace"
  | "limitations"
>;

function isBlank(value: string | readonly string[]): boolean {
  return typeof value === "string" ? value.trim() === "" : value.length === 0;
}

export function measureKindOf(field: ProfileField): MeasureKind | null {
  return MEASURE_KINDS.includes(field.kind)
    ? (field.kind as MeasureKind)
    : null;
}

function displayAmount(
  field: ProfileField,
  canonical: number,
  units: MeasureUnits,
): number {
  const measureKind = measureKindOf(field);

  return Math.round(
    measureKind ? toDisplayMeasure(measureKind, canonical, units) : canonical,
  );
}

export function entryBounds(
  field: ProfileField,
  units: MeasureUnits,
): ProfileFieldRange | null {
  return field.range
    ? {
        min: displayAmount(field, field.range.min, units),
        max: displayAmount(field, field.range.max, units),
      }
    : null;
}

export function outOfRangeMessage(
  field: ProfileField & { kind: ProfileMeasureKind },
  units: MeasureUnits,
): string {
  const bounds = entryBounds(field, units);

  return bounds
    ? `Enter ${AMOUNT_NOUNS[field.kind]} between ${bounds.min} and ${bounds.max} ${measureUnitLabel(field.kind, units)}.`
    : `Enter ${AMOUNT_NOUNS[field.kind]}.`;
}

function measureProblem(
  field: ProfileField & { kind: ProfileMeasureKind },
  context: { entered: string; units: MeasureUnits },
): string | null {
  const amount = Number(context.entered);

  if (!Number.isFinite(amount)) return `Enter ${AMOUNT_NOUNS[field.kind]}.`;

  const bounds = entryBounds(field, context.units);

  return bounds && (amount < bounds.min || amount > bounds.max)
    ? outOfRangeMessage(field, context.units)
    : null;
}

export function requiredMessage(field: ProfileField): string {
  if (field.kind === "height" || field.kind === "weight") {
    return `Enter ${AMOUNT_NOUNS[field.kind]}.`;
  }

  return REQUIRED_MESSAGES[field.kind] ?? TEXT_REQUIRED_MESSAGE;
}

export function lengthProblemMessage(maxLength: number): string {
  return `Keep it to ${maxLength} characters or fewer.`;
}

function profileFieldProblem(
  field: ProfileField,
  value: string | readonly string[],
  units: MeasureUnits,
): string | null {
  if (isBlank(value)) {
    return field.requirement === "required" ? requiredMessage(field) : null;
  }

  if (typeof value !== "string") return null;

  if (field.kind === "height" || field.kind === "weight") {
    return measureProblem(
      { ...field, kind: field.kind },
      { entered: value, units },
    );
  }

  return field.maxLength !== undefined && value.trim().length > field.maxLength
    ? lengthProblemMessage(field.maxLength)
    : null;
}

function refinedByProfileRules<Value extends string | string[]>(
  schema: z.ZodType<Value, Value>,
  field: ProfileField,
  units: MeasureUnits,
): z.ZodType<Value, Value> {
  return schema.superRefine((value, context) => {
    const problem = profileFieldProblem(field, value, units);

    if (problem) {
      context.addIssue({ code: "custom", message: problem });
    }
  });
}

export function profileFieldSchema(
  field: ProfileTextField,
  units: MeasureUnits = CANONICAL_MEASURE_UNITS,
): z.ZodType<string, string> {
  return refinedByProfileRules(z.string(), field, units);
}

function entrySchemaOf(field: ProfileField, units: MeasureUnits) {
  return field.kind === "chips"
    ? refinedByProfileRules(z.array(z.string()), field, units)
    : profileFieldSchema({ ...field, kind: field.kind }, units);
}

export function profileFieldsSchema<Values extends ProfileFieldValues>(
  fields: readonly (ProfileField & { id: keyof Values & string })[],
  units: MeasureUnits,
): z.ZodType<Values, Values> {
  const schema: z.ZodType<ProfileFieldValues, ProfileFieldValues> = z.object(
    Object.fromEntries(
      fields.map((field) => [field.id, entrySchemaOf(field, units)]),
    ),
  );

  return schema as z.ZodType<Values, Values>;
}

export function measureValue(
  kind: ProfileMeasureKind,
  canonical: number | null,
  units: MeasureUnits,
): string {
  return canonical === null
    ? ""
    : String(toDisplayMeasure(kind, canonical, units));
}

export function canonicalMeasure(
  kind: ProfileMeasureKind,
  entered: string,
  units: MeasureUnits,
): number | null {
  const amount = Number(entered);

  return entered.trim() !== "" && Number.isFinite(amount)
    ? toCanonicalMeasure(kind, amount, units)
    : null;
}

export function sharedFactValues(
  facts: SharedFactsView,
  units: MeasureUnits,
): SharedFactValues {
  return {
    height: measureValue("height", facts.heightCm, units),
    trainingDays: String(facts.trainingDays),
    sessionMinutes: String(facts.sessionMinutes),
    equipment: [...facts.equipment],
    trainingPlace: facts.trainingPlace ?? "",
    limitations: facts.limitations,
  };
}

export function sharedFactsOf(values: SharedFactValues, units: MeasureUnits) {
  return {
    heightCm: canonicalMeasure("height", values.height, units),
    trainingDays: Number(values.trainingDays),
    sessionMinutes: Number(values.sessionMinutes),
    equipment: values.equipment,
    trainingPlace: values.trainingPlace || null,
    limitations: values.limitations.trim(),
  };
}

export type FactProblemMessage<Values> = {
  field: keyof Values;
  message: string;
};

export function presentProblems<Values>(
  messages: (FactProblemMessage<Values> | null)[],
): FactProblemMessage<Values>[] {
  return messages.filter(
    (message): message is FactProblemMessage<Values> => message !== null,
  );
}

export function sharedFactProblemMessages(
  problems: ClientProfileProblems,
  units: MeasureUnits,
): FactProblemMessage<SharedFactValues>[] {
  return presentProblems<SharedFactValues>([
    problems.heightCm
      ? {
          field: "height",
          message: outOfRangeMessage(COACHING_FIELDS.height, units),
        }
      : null,
    problems.limitations
      ? {
          field: "limitations",
          message: lengthProblemMessage(MAX_PROFILE_NOTE_LENGTH),
        }
      : null,
  ]);
}
