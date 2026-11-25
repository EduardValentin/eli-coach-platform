import {
  WEEKDAYS,
  type BlockType,
  type LastSetTechnique,
  type RowField,
  type SetKind,
  type Slot,
  type SplitShape,
  type TrainingDays,
  type Weekday,
} from "./vocabulary";

export const SINGLE_UNIT_SLOTS: readonly Slot[] = ["A", "B"];
export const MAX_SUBSTITUTIONS = 2;
export const MAX_WARM_UP_ITEMS = 4;

export type Range = { min: number; max: number };

export type WarmUpItem = {
  id: string;
  exerciseId: string;
  sets: number;
  reps?: Range;
  seconds?: number;
};

export type CoolDownItem = { id: string; exerciseId: string; seconds: number };

export type CoolDown = { enabled: boolean; items: CoolDownItem[] };

export type SetTargets = { reps: Range; rir: number; weightKg?: number };

export type PlannedSet = { id: string; kind: SetKind; start: SetTargets };

type Progression = { kind: "double" } | { kind: "custom"; text: string };

export type ExerciseRow = {
  id: string;
  exerciseId: string;
  slot: Slot;
  supersetGroup?: string;
  startSets: PlannedSet[];
  restSeconds: number;
  tempo?: string;
  lastSetTechnique: LastSetTechnique;
  substitutions: string[];
  progression: Progression;
  cues: string;
  touched: RowField[];
};

export type Session = {
  id: string;
  originId: string;
  name: string;
  warmUp: { items: WarmUpItem[] };
  coolDown: CoolDown;
  rows: ExerciseRow[];
};

export type CardioIntensity = "easy" | "moderate" | "hard";

export type CardioSegment = {
  id: string;
  kind: "steady";
  exerciseId: string;
  minutes: number;
  intensity: CardioIntensity;
};

export type CardioSession = {
  id: string;
  originId: string;
  name: string;
  segments: CardioSegment[];
};

export type CalendarEntry =
  | { kind: "session"; sessionId: string }
  | { kind: "cardio"; cardioId: string }
  | { kind: "rest" };

export type WeeklyCalendar = Record<Weekday, CalendarEntry>;

export type Block = {
  id: string;
  originId: string;
  type: BlockType;
  weeks: number;
  trainingDays: TrainingDays;
  calibrationWeek: boolean;
  introText: string;
  clientNote: string;
  split: { shape: SplitShape; name: string; text: string };
  targetMinutes: number;
  calendar: WeeklyCalendar;
  sessions: Session[];
  cardioSessions: CardioSession[];
  dailySteps: number;
  missedDayNote: string;
};

export type ProgramContent = {
  header: { title: string; focus: string; personalNote: string };
  plan: { blocks: Block[] };
  nutritionNotes: string;
  lifestyleNotes: string;
};

export function mapCalendar(
  entryOn: (day: Weekday) => CalendarEntry,
): WeeklyCalendar {
  return Object.fromEntries(
    WEEKDAYS.map((day) => [day, entryOn(day)]),
  ) as WeeklyCalendar;
}
