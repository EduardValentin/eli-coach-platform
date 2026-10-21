import type { CycleMode } from './cycleMode';
import type { Equipment, ExerciseRole } from './exercises';

export type { CycleMode };

export type ProgramLanguage = 'en' | 'ro';
export type LevelHint = 'beginner' | 'intermediate' | 'advanced';
export type BlockType = 'foundation' | 'hypertrophy' | 'strength' | 'deload';
export const BLOCK_TYPES: readonly BlockType[] = ['foundation', 'hypertrophy', 'strength', 'deload'];
export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  foundation: 'Foundation',
  hypertrophy: 'Hypertrophy',
  strength: 'Strength',
  deload: 'Deload',
};
export type SplitShape = 'full-body' | 'upper-lower';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export type Slot = 'A' | 'B' | 'C' | 'D';
export const SLOTS: readonly Slot[] = ['A', 'B', 'C', 'D'];
export type Range = { min: number; max: number };
export type LastSetTechnique = 'none' | 'drop-set' | 'rest-pause';
export type Progression = { kind: 'double' } | { kind: 'custom'; text: string };
export type SetSpec = { reps: Range; rir: Range };
export type RowField =
  | 'sets'
  | 'restSeconds'
  | 'warmUpSets'
  | 'weightKg'
  | 'tempo'
  | 'lastSetTechnique'
  | 'substitutions'
  | 'progression'
  | 'cues';
export type Row = {
  id: string;
  exerciseId: string;
  slot: Slot;
  supersetGroup?: string;
  warmUpSets?: string;
  sets: SetSpec[];
  weightKg?: number;
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
  warmUp: { mobilityExerciseIds: string[]; warmUpSetsNote: string };
  coolDown: boolean;
  rows: Row[];
};
export type CardioType = 'liss' | 'moderate' | 'hiit' | 'finisher';
export type CardioSession = {
  id: string;
  type: CardioType;
  minutes: number;
  intensityText: string;
  weekday: Weekday;
  placement: 'after-session' | 'separate';
};
export type CalendarEntry =
  | { kind: 'session'; sessionId: string }
  | { kind: 'cardio'; cardioId: string }
  | { kind: 'rest' };
export type Block = {
  id: string;
  originId: string;
  type: BlockType;
  weeks: number;
  calibrationWeek: boolean;
  introText: string;
  clientNote: string;
  split: { shape: SplitShape; name: string; text: string };
  targetMinutes: number;
  calendar: Record<Weekday, CalendarEntry>;
  sessions: Session[];
  cardioSessions: CardioSession[];
  dailySteps: number;
  missedDayNote: string;
};
export type CycleAdjustment = 'none' | 'rir-plus-one' | 'one-set-less' | 'hiit-to-liss' | 'low-energy-session';
export type CycleRule = { id: string; symptomPeriod: string; adjustment: CycleAdjustment };
export type ProgramContent = {
  header: { title: string; focus: string; personalNote: string };
  plan: { blocks: Block[] };
  cycleRules: CycleRule[];
  nutritionNotes: string;
  lifestyleNotes: string;
};
export type VersionState = 'draft' | 'published' | 'superseded';
export type ProgramVersion = {
  number: number;
  state: VersionState;
  publishedAt: Date | null;
  whatChanged: string;
  content: ProgramContent;
};
export type Program = {
  callId: string;
  goal: string;
  equipment: Equipment[];
  language: ProgramLanguage;
  cycleMode: CycleMode;
  level: LevelHint;
  versions: ProgramVersion[];
};

export function currentVersion(program: Program): ProgramVersion | undefined {
  return program.versions.find(version => version.state === 'published');
}

export function draftOf(program: Program): ProgramVersion | undefined {
  return program.versions.find(version => version.state === 'draft');
}

const ROLE_BY_SLOT: Record<Slot, ExerciseRole> = {
  A: 'main-compound',
  B: 'secondary-compound',
  C: 'isolation',
  D: 'isolation',
};

export function roleForSlot(slot: Slot): ExerciseRole {
  return ROLE_BY_SLOT[slot];
}

export function formatRange({ min, max }: Range): string {
  return min === max ? String(min) : `${min}–${max}`;
}

function sameRange(left: Range, right: Range): boolean {
  return left.min === right.min && left.max === right.max;
}

export function setText(set: SetSpec, repsSuffix = ''): string {
  return `${formatRange(set.reps)}${repsSuffix} · RIR ${formatRange(set.rir)}`;
}

export function uniformSets(sets: SetSpec[]): boolean {
  const [first] = sets;
  return sets.every(set => sameRange(set.reps, first.reps) && sameRange(set.rir, first.rir));
}

export function setsSummary(sets: SetSpec[], repsSuffix = ''): string {
  const [first] = sets;
  if (!first) return 'No sets';
  if (!uniformSets(sets)) return `${sets.length} sets`;
  return `${sets.length} × ${setText(first, repsSuffix)}`;
}

export function positionLabel(session: Session, row: Row): string {
  if (row.supersetGroup === undefined) return row.slot;
  const group = session.rows.filter(
    other => other.slot === row.slot && other.supersetGroup === row.supersetGroup,
  );
  if (group.length < 2) return row.slot;
  return `${row.slot}${group.findIndex(other => other.id === row.id) + 1}`;
}

export function newId(): string {
  return crypto.randomUUID();
}

function calendarWithIds(
  calendar: Record<Weekday, CalendarEntry>,
  sessionIds: ReadonlyMap<string, string>,
  cardioIds: ReadonlyMap<string, string>,
): Record<Weekday, CalendarEntry> {
  const entries = WEEKDAYS.map((day): [Weekday, CalendarEntry] => {
    const entry = calendar[day];
    if (entry.kind === 'session') return [day, { kind: 'session', sessionId: sessionIds.get(entry.sessionId) ?? entry.sessionId }];
    if (entry.kind === 'cardio') return [day, { kind: 'cardio', cardioId: cardioIds.get(entry.cardioId) ?? entry.cardioId }];
    return [day, entry];
  });
  return Object.fromEntries(entries) as Record<Weekday, CalendarEntry>;
}

function blockWithFreshIds(block: Block): Block {
  const sessionIds = new Map(block.sessions.map(session => [session.id, newId()]));
  const cardioIds = new Map(block.cardioSessions.map(cardio => [cardio.id, newId()]));
  return {
    ...block,
    id: newId(),
    calendar: calendarWithIds(block.calendar, sessionIds, cardioIds),
    sessions: block.sessions.map(session => ({
      ...session,
      id: sessionIds.get(session.id) as string,
      rows: session.rows.map(row => ({ ...row, id: newId() })),
    })),
    cardioSessions: block.cardioSessions.map(cardio => ({ ...cardio, id: cardioIds.get(cardio.id) as string })),
  };
}

export function contentWithFreshIds(content: ProgramContent): ProgramContent {
  return {
    ...structuredClone(content),
    plan: { blocks: content.plan.blocks.map(block => blockWithFreshIds(structuredClone(block))) },
    cycleRules: content.cycleRules.map(rule => ({ ...rule, id: newId() })),
  };
}

export function filledSessionCount(block: Block): number {
  return block.sessions.filter(session => session.rows.some(row => row.exerciseId !== '')).length;
}
