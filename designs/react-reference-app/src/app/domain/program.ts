import type { CycleMode } from './cycleMode';
import type { ExerciseRole } from './exercises';

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
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
export function weekdayAbbreviation(day: Weekday): string {
  return WEEKDAY_LABELS[day].slice(0, 3);
}
export type Slot = 'A' | 'B' | 'C' | 'D';
export const SLOTS: readonly Slot[] = ['A', 'B', 'C', 'D'];
export type Range = { min: number; max: number };
export type LastSetTechnique = 'none' | 'drop-set' | 'rest-pause';
export type Progression = { kind: 'double' } | { kind: 'custom'; text: string };
export type WarmUpSet = { kind: 'warm-up'; reps: Range; weightKg?: number };
export type WorkingSet = { kind: 'working'; reps: Range; rir: Range; weightKg?: number };
export type SetSpec = WarmUpSet | WorkingSet;
export type RowField =
  | 'sets'
  | 'restSeconds'
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
  sets: SetSpec[];
  restSeconds: number;
  tempo?: string;
  lastSetTechnique: LastSetTechnique;
  substitutions: string[];
  progression: Progression;
  cues: string;
  touched: RowField[];
};
export type WarmUpItem = { id: string; exerciseId: string; sets: number; reps?: Range; seconds?: number };
export type CoolDownItem = { id: string; exerciseId: string; seconds: number };
export type CoolDown = { enabled: boolean; note: string; items: CoolDownItem[] };
export type Session = {
  id: string;
  originId: string;
  name: string;
  warmUp: { items: WarmUpItem[] };
  coolDown: CoolDown;
  rows: Row[];
};
export type CardioIntensity = 'easy' | 'moderate' | 'hard';
export type RoundsItem = { id: string; exerciseId: string; workSeconds?: number; reps?: number };
export type SteadySegment = { id: string; kind: 'steady'; exerciseId: string; minutes: number; intensity: CardioIntensity };
export type RoundsSegment = {
  id: string;
  kind: 'rounds';
  items: RoundsItem[];
  easySeconds: number;
  restBetweenRoundsSeconds: number;
  rounds: number;
  intensity: CardioIntensity;
};
export type CardioSegment = SteadySegment | RoundsSegment;
export type CardioSession = { id: string; originId: string; name: string; segments: CardioSegment[] };
export type CalendarEntry =
  | { kind: 'session'; sessionId: string }
  | { kind: 'cardio'; cardioId: string }
  | { kind: 'rest' };
export type TrainingDays = 2 | 3 | 4 | 5;
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
  language: ProgramLanguage;
  cycleMode: CycleMode;
  level: LevelHint;
  versions: ProgramVersion[];
};

export function withField<Field extends RowField>(row: Row, field: Field, value: Row[Field]): Row {
  const touched = row.touched.includes(field) ? row.touched : [...row.touched, field];
  return { ...row, [field]: value, touched };
}

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

export function isWorkingSet(set: SetSpec): set is WorkingSet {
  return set.kind === 'working';
}

export function workingSets(sets: readonly SetSpec[]): WorkingSet[] {
  return sets.filter(isWorkingSet);
}

export function setText(set: WorkingSet, repsSuffix = ''): string {
  return `${formatRange(set.reps)}${repsSuffix} · RIR ${formatRange(set.rir)}`;
}

export function hasUniformSets(sets: readonly SetSpec[]): boolean {
  const working = workingSets(sets);
  const [first] = working;
  return working.every(set => sameRange(set.reps, first.reps) && sameRange(set.rir, first.rir));
}

function workingSummary(sets: WorkingSet[], repsSuffix: string): string {
  const [first] = sets;
  if (!hasUniformSets(sets)) return `${sets.length} sets`;
  return `${sets.length} × ${setText(first, repsSuffix)}`;
}

export function setsSummary(sets: readonly SetSpec[], repsSuffix = ''): string {
  if (sets.length === 0) return 'No sets';
  const working = workingSets(sets);
  const warmUpCount = sets.length - working.length;
  const parts = [
    ...(warmUpCount > 0 ? [`${warmUpCount} warm-up`] : []),
    ...(working.length > 0 ? [workingSummary(working, repsSuffix)] : []),
  ];
  return parts.join(' · ');
}

export function warmUpItemText(item: WarmUpItem): string {
  const amount = item.seconds === undefined ? formatRange(item.reps ?? { min: 0, max: 0 }) : `${item.seconds} s`;
  return `${item.sets} × ${amount}`;
}

export function positionLabel(session: Session, row: Row): string {
  if (row.supersetGroup === undefined) return row.slot;
  const group = session.rows.filter(
    other => other.slot === row.slot && other.supersetGroup === row.supersetGroup,
  );
  if (group.length < 2) return row.slot;
  return `${row.slot}${group.findIndex(other => other.id === row.id) + 1}`;
}

export function swappedWithNeighbour<Item extends { id: string }>(items: Item[], id: string, step: number): Item[] {
  const index = items.findIndex(item => item.id === id);
  const target = index + step;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function mapCalendar(entryOn: (day: Weekday) => CalendarEntry): Record<Weekday, CalendarEntry> {
  return Object.fromEntries(WEEKDAYS.map(day => [day, entryOn(day)])) as Record<Weekday, CalendarEntry>;
}

export function sessionOn(block: Block, day: Weekday): Session | undefined {
  const entry = block.calendar[day];
  return entry.kind === 'session' ? block.sessions.find(session => session.id === entry.sessionId) : undefined;
}

export function cardioOn(block: Block, day: Weekday): CardioSession | undefined {
  const entry = block.calendar[day];
  return entry.kind === 'cardio' ? block.cardioSessions.find(cardio => cardio.id === entry.cardioId) : undefined;
}

export function scheduledSessions(block: Block): Session[] {
  const ids = new Set(WEEKDAYS.flatMap(day => sessionOn(block, day)?.id ?? []));
  return block.sessions.filter(session => ids.has(session.id));
}

export function hasExercises(session: Session): boolean {
  return session.rows.some(row => row.exerciseId !== '');
}

export function filledSessionCount(block: Block): number {
  return block.sessions.filter(hasExercises).length;
}

export function copiedSessions(sessions: readonly Session[]): Session[] {
  return sessions.map(session => ({
    ...session,
    id: newId(),
    rows: session.rows.map(row => ({ ...row, id: newId() })),
  }));
}

function segmentWithFreshIds(segment: CardioSegment): CardioSegment {
  if (segment.kind === 'steady') return { ...segment, id: newId() };
  return { ...segment, id: newId(), items: segment.items.map(item => ({ ...item, id: newId() })) };
}

function copiedCardioSessions(cardioSessions: readonly CardioSession[]): CardioSession[] {
  return cardioSessions.map(cardio => ({ ...cardio, id: newId(), segments: cardio.segments.map(segmentWithFreshIds) }));
}

function idsByPosition<Item extends { id: string }>(before: readonly Item[], after: readonly Item[]): ReadonlyMap<string, string> {
  return new Map(before.map((item, index) => [item.id, after[index].id]));
}

function calendarWithIds(block: Block, sessionIds: ReadonlyMap<string, string>, cardioIds: ReadonlyMap<string, string>): Record<Weekday, CalendarEntry> {
  return mapCalendar(day => {
    const entry = block.calendar[day];
    if (entry.kind === 'session') return { kind: 'session', sessionId: sessionIds.get(entry.sessionId) ?? entry.sessionId };
    if (entry.kind === 'cardio') return { kind: 'cardio', cardioId: cardioIds.get(entry.cardioId) ?? entry.cardioId };
    return entry;
  });
}

export function blockWithFreshIds(block: Block): Block {
  const sessions = copiedSessions(block.sessions);
  const cardioSessions = copiedCardioSessions(block.cardioSessions);
  return {
    ...block,
    id: newId(),
    calendar: calendarWithIds(block, idsByPosition(block.sessions, sessions), idsByPosition(block.cardioSessions, cardioSessions)),
    sessions,
    cardioSessions,
  };
}

export function contentWithFreshIds(content: ProgramContent): ProgramContent {
  return {
    ...structuredClone(content),
    plan: { blocks: content.plan.blocks.map(block => blockWithFreshIds(structuredClone(block))) },
    cycleRules: content.cycleRules.map(rule => ({ ...rule, id: newId() })),
  };
}

function segmentExerciseIds(segment: CardioSegment): string[] {
  return segment.kind === 'steady' ? [segment.exerciseId] : segment.items.map(item => item.exerciseId);
}

function sessionExerciseIds(session: Session): string[] {
  return [
    ...session.warmUp.items.map(item => item.exerciseId),
    ...session.coolDown.items.map(item => item.exerciseId),
    ...session.rows.flatMap(row => [row.exerciseId, ...row.substitutions]),
  ];
}

function blockExerciseIds(block: Block): string[] {
  return [...block.sessions.flatMap(sessionExerciseIds), ...block.cardioSessions.flatMap(cardio => cardio.segments.flatMap(segmentExerciseIds))];
}

export function programExerciseIds(program: Program): string[] {
  const ids = program.versions.flatMap(version => version.content.plan.blocks.flatMap(blockExerciseIds));
  return [...new Set(ids.filter(id => id !== ''))];
}

export function weekCounts(block: Block): { sessions: number; cardio: number } {
  const entries = Object.values(block.calendar);
  return { sessions: entries.filter(entry => entry.kind === 'session').length, cardio: entries.filter(entry => entry.kind === 'cardio').length };
}
