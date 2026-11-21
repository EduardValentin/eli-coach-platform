import {
  CLIENT_LEVELS,
  DAILY_STEP_TARGETS,
  PROGRAM_LANGUAGES,
  SESSION_MINUTE_OPTIONS,
  SPLIT_SHAPES,
  SplitTemplate,
  TRAINING_DAY_OPTIONS,
  type ClientGender,
  type ClientLevel,
  type EquipmentOption,
  type ProgramLanguage,
  type ProgramSetupProblems,
  type ProgramSetupValues,
  type SessionMinutes,
  type SplitShape,
  type TrainingDays,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import { z } from "zod";

const TEXT_MAX_LENGTH = 200;

const EQUIPMENT_MAX_ITEMS = 20;

export const programSetupRequestSchema = z.strictObject({
  goal: z.string().max(TEXT_MAX_LENGTH),
  level: z.enum(CLIENT_LEVELS),
  trainingDays: z.literal(TRAINING_DAY_OPTIONS),
  sessionMinutes: z.literal(SESSION_MINUTE_OPTIONS),
  language: z.enum(PROGRAM_LANGUAGES),
  dailySteps: z.number().refine((steps) => DAILY_STEP_TARGETS.includes(steps)),
  splitShape: z.enum(SPLIT_SHAPES),
  equipment: z.array(z.string().max(TEXT_MAX_LENGTH)).max(EQUIPMENT_MAX_ITEMS),
}) satisfies z.ZodType<ProgramSetupValues>;

type ProgramSetupRequest = z.infer<typeof programSetupRequestSchema>;

type SetupOption<Value> = { value: Value; label: string };

type ProgramSetupChoices = {
  goals: SetupOption<string>[];
  equipment: EquipmentOption[];
  levels: SetupOption<ClientLevel>[];
  trainingDays: (SetupOption<TrainingDays> & { splitShape: SplitShape })[];
  splitShapes: SetupOption<SplitShape>[];
  sessionMinutes: SetupOption<SessionMinutes>[];
  dailySteps: SetupOption<number>[];
  languages: SetupOption<ProgramLanguage>[];
};

type ProgramSetupClient = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: ClientGender;
};

export type ProgramSetupView =
  | { state: "not-ready"; client: ProgramSetupClient }
  | {
      state: "ready";
      client: ProgramSetupClient;
      startingValues: ProgramSetupRequest;
      choices: ProgramSetupChoices;
    };

export type ProgramCreateOutcome =
  { status: "invalid"; problems: ProgramSetupProblems } | { status: "failed" };

type ProgramSetupOffer = {
  goalOptions: readonly string[];
  equipmentOptions: readonly EquipmentOption[];
  splitShapeByTrainingDays: Record<TrainingDays, SplitShape>;
};

const COACH_GOAL_LABELS: Record<string, string> = {
  "Lose fat": "Fat loss",
  "Build muscle": "Muscle gain",
  "Maintain a healthy weight": "Weight maintenance",
  "Learn to balance activity and nutrition": "Activity and nutrition balance",
  "Improve overall health": "Overall health",
  "Work with my menstrual cycle": "Cycle-aware training",
};

const LEVEL_LABELS: Record<ClientLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

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

const LANGUAGE_LABELS: Record<ProgramLanguage, string> = {
  en: "English",
  ro: "Romanian",
};

export function programSetupChoices({
  goalOptions,
  equipmentOptions,
  splitShapeByTrainingDays,
}: ProgramSetupOffer): ProgramSetupChoices {
  return {
    goals: goalOptions.map((goal) => ({
      value: goal,
      label: COACH_GOAL_LABELS[goal] ?? goal,
    })),
    equipment: equipmentOptions.map((option) => ({ ...option })),
    levels: labelled(CLIENT_LEVELS, LEVEL_LABELS),
    trainingDays: labelled(TRAINING_DAY_OPTIONS, TRAINING_DAY_LABELS).map(
      (option) => ({
        ...option,
        splitShape: splitShapeByTrainingDays[option.value],
      }),
    ),
    splitShapes: SPLIT_SHAPES.map((shape) => ({
      value: shape,
      label: SplitTemplate.of(shape).label,
    })),
    sessionMinutes: labelled(SESSION_MINUTE_OPTIONS, SESSION_MINUTE_LABELS),
    dailySteps: DAILY_STEP_TARGETS.map((steps) => ({
      value: steps,
      label: steps.toLocaleString("en-US"),
    })),
    languages: labelled(PROGRAM_LANGUAGES, LANGUAGE_LABELS),
  };
}

function labelled<Value extends string | number>(
  values: readonly Value[],
  labels: Record<Value, string>,
): SetupOption<Value>[] {
  return values.map((value) => ({ value, label: labels[value] }));
}
