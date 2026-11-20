import type { ExerciseRole, MovementPattern } from './exercises';
import type { GuideTexts } from './programTemplates';

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
export const LAST_SET_TECHNIQUE_LABELS: Record<LastSetTechnique, string> = { none: 'None', 'drop-set': 'Drop set', 'rest-pause': 'Rest-pause' };
export type Progression = { kind: 'double' } | { kind: 'custom'; text: string };
export type SetKind = 'warm-up' | 'working';
export type WarmUpSet = { kind: 'warm-up'; reps: Range; weightKg?: number };
type WorkingSet = { kind: 'working'; reps: Range; rir: number; weightKg?: number };
/** One set as the client reads it in a week: the flat list a resolved week expands to. */
export type SetSpec = WarmUpSet | WorkingSet;
/** The block's defaults for a row's working sets, before they become one planned set each; `lastSetRir` is the last set's RIR when it differs. */
export type WorkingTargets = { count: number; reps: Range; rir: number; lastSetRir?: number; weightKg?: number };
/** What one set asks for. A warm-up set keeps an RIR it does not show, so switching it to a working set has one. */
export type SetTargets = { reps: Range; rir: number; weightKg?: number };
export type SetTarget = keyof SetTargets;
export type TypedTargets = Partial<SetTargets>;
/** One set of the first week, or one added in a later week, with the targets it starts from before the coach types. */
export type PlannedSet = { id: string; kind: SetKind; start: SetTargets };
/** What the coach did in one week, by set id: only that week reads it. */
export type WeekChanges = {
  typed?: Partial<Record<string, TypedTargets>>;
  added?: PlannedSet[];
  removed?: string[];
  /** In the order the coach switched them, which places them at the end of the warm-up sets or the start of the working sets. */
  switched?: string[];
};
export type RowField =
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
  /** The block's first week as its defaults or the previous block leave it; the weeks after it are suggested from it. */
  startSets: PlannedSet[];
  /** Sparse, by week of the block, so a week the coach never touched keeps following the first week. */
  weekChanges?: Partial<Record<number, WeekChanges>>;
  restSeconds: number;
  tempo?: string;
  lastSetTechnique: LastSetTechnique;
  substitutions: string[];
  progression: Progression;
  cues: string;
  touched: RowField[];
};
/** A row as it reads in one week of its block, with that week's sets in order. */
export type WeekRow = Omit<Row, 'startSets' | 'weekChanges'> & { sets: SetSpec[] };
export type WarmUpItem = { id: string; exerciseId: string; sets: number; reps?: Range; seconds?: number };
export type CoolDownItem = { id: string; exerciseId: string; seconds: number };
export type CoolDown = { enabled: boolean; items: CoolDownItem[] };
export type Session = {
  id: string;
  originId: string;
  name: string;
  warmUp: { items: WarmUpItem[] };
  coolDown: CoolDown;
  rows: Row[];
};
export type WeekSession = Omit<Session, 'rows'> & { rows: WeekRow[] };
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
export type ProgramContent = {
  header: { title: string; focus: string; personalNote: string };
  plan: { blocks: Block[] };
  nutritionNotes: string;
  lifestyleNotes: string;
  guideTexts?: GuideTexts;
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

/** The lowest to the highest RIR of several sets, one number when they agree. */
export function rirSpan(rirs: readonly number[]): Range {
  return { min: Math.min(...rirs), max: Math.max(...rirs) };
}

const SECONDS_PER_MINUTE = 60;

export function formatRest(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) return `${seconds} s`;
  const rest = seconds % SECONDS_PER_MINUTE;
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(rest).padStart(2, '0')}`;
}

function sameRange(left: Range, right: Range): boolean {
  return left.min === right.min && left.max === right.max;
}

/** What makes two working sets different kinds of set; RIR steps down across a week's sets by design. */
export const SET_KIND_TARGETS = ['reps', 'weightKg'] as const;
type SetKindTargets = Pick<SetTargets, (typeof SET_KIND_TARGETS)[number]>;

export function hasSameTarget(target: (typeof SET_KIND_TARGETS)[number], left: SetKindTargets, right: SetKindTargets): boolean {
  if (target === 'reps') return sameRange(left.reps, right.reps);
  return left[target] === right[target];
}

export function isSameKindOfSet(left: SetKindTargets, right: SetKindTargets): boolean {
  return SET_KIND_TARGETS.every(target => hasSameTarget(target, left, right));
}

export function isWorkingSet(set: SetSpec): set is WorkingSet {
  return set.kind === 'working';
}

function workingSets(sets: readonly SetSpec[]): WorkingSet[] {
  return sets.filter(isWorkingSet);
}

/** Each set with its number among the sets of its kind: warm-up sets and working sets count apart. */
export function numberedSets<Set extends { kind: SetKind }>(sets: readonly Set[]): { set: Set; number: number }[] {
  const counts = { working: 0, 'warm-up': 0 };
  return sets.map(set => {
    counts[set.kind] += 1;
    return { set, number: counts[set.kind] };
  });
}

export function plannedSet(kind: SetKind, start: SetTargets): PlannedSet {
  return { id: newId(), kind, start: structuredClone(start) };
}

/** The targets of each of `count` working sets: every set at the default RIR, the last at `lastSetRir`. */
export function workingStarts(working: WorkingTargets): SetTargets[] {
  const { count, rir, lastSetRir = rir, ...targets } = working;
  return Array.from({ length: count }, (_, index) => ({ ...structuredClone(targets), rir: index === count - 1 ? lastSetRir : rir }));
}

/** One planned set per working set the defaults count, after the warm-up sets. */
export function plannedSets(warmUps: readonly SetTargets[], working: WorkingTargets): PlannedSet[] {
  return [...warmUps.map(start => plannedSet('warm-up', start)), ...workingStarts(working).map(start => plannedSet('working', start))];
}

export type SetsBreakdown = { warmUp: number; working: number; reps: string | null; rir: Range | null };

/** `reps` only when every working set is the same kind of set, so the reps speak for all of them. */
export function setsBreakdown(sets: readonly SetSpec[], repsSuffix = ''): SetsBreakdown {
  const working = workingSets(sets);
  const [first] = working;
  const uniform = first !== undefined && working.every(set => isSameKindOfSet(first, set));
  return {
    warmUp: sets.length - working.length,
    working: working.length,
    reps: uniform ? `${formatRange(first.reps)}${repsSuffix}` : null,
    rir: first === undefined ? null : rirSpan(working.map(set => set.rir)),
  };
}

export function warmUpItemText(item: WarmUpItem): string {
  const amount = item.seconds === undefined ? formatRange(item.reps ?? { min: 0, max: 0 }) : `${item.seconds} s`;
  return `${item.sets} × ${amount}`;
}

export type PlacedRow = Pick<Row, 'id' | 'slot' | 'supersetGroup'>;

export function positionLabel(session: { rows: readonly PlacedRow[] }, row: PlacedRow): string {
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

export function hasCoolDown(session: Pick<Session, 'coolDown'>): boolean {
  return session.coolDown.enabled && session.coolDown.items.length > 0;
}

export function planHasCoolDown(blocks: readonly Block[]): boolean {
  return blocks.some(block => block.sessions.some(hasCoolDown));
}

export function scheduledSessions(block: Block): Session[] {
  const ids = new Set(WEEKDAYS.flatMap(day => sessionOn(block, day)?.id ?? []));
  return block.sessions.filter(session => ids.has(session.id));
}

export function hasExercises(session: Session): boolean {
  return session.rows.some(row => row.exerciseId !== '');
}

export function isBlockWritten(block: Block): boolean {
  return scheduledSessions(block).some(hasExercises);
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

