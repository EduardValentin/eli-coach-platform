import {
  WEEKDAYS,
  type BlockType,
  type SplitShape,
  type TrainingDays,
  type Weekday,
} from "./vocabulary";

type Range = { min: number; max: number };

type WarmUpItem = {
  id: string;
  exerciseId: string;
  sets: number;
  reps?: Range;
  seconds?: number;
};

type CoolDownItem = { id: string; exerciseId: string; seconds: number };

export type ExerciseRow = { id: string; exerciseId: string };

export type Session = {
  id: string;
  originId: string;
  name: string;
  warmUp: { items: WarmUpItem[] };
  coolDown: { enabled: boolean; items: CoolDownItem[] };
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
