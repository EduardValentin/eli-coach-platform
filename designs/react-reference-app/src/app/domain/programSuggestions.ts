import type { Equipment } from './exercises';
import {
  newId,
  roleForSlot,
  WEEKDAYS,
  type Block,
  type BlockType,
  type CalendarEntry,
  type CardioSession,
  type LevelHint,
  type ProgramContent,
  type ProgramLanguage,
  type Row,
  type Session,
  type Slot,
  type SplitShape,
  type Weekday,
} from './program';
import type { ProgramSetup } from './programOnboarding';
import { cardioDefaults, reDefaultedBlock, rowDefaults } from './programDefaults';
import { fillTemplate, templateText } from './programTemplates';
import type { Exercise } from '../context/TrainingContext';

type SuggestedBlock = { type: BlockType; weeks: number; calibrationWeek: boolean };

const SUGGESTED_BLOCKS: Record<LevelHint, SuggestedBlock[]> = {
  beginner: [
    { type: 'foundation', weeks: 4, calibrationWeek: false },
    { type: 'hypertrophy', weeks: 6, calibrationWeek: false },
    { type: 'deload', weeks: 1, calibrationWeek: false },
  ],
  intermediate: [
    { type: 'hypertrophy', weeks: 6, calibrationWeek: true },
    { type: 'deload', weeks: 1, calibrationWeek: false },
    { type: 'hypertrophy', weeks: 6, calibrationWeek: false },
  ],
  advanced: [
    { type: 'hypertrophy', weeks: 5, calibrationWeek: true },
    { type: 'strength', weeks: 5, calibrationWeek: false },
    { type: 'deload', weeks: 1, calibrationWeek: false },
  ],
};

const SESSION_NAMES: Record<SplitShape, string[]> = {
  'full-body': ['Full Body A', 'Full Body B', 'Full Body C'],
  'upper-lower': ['Lower A', 'Upper A', 'Lower B', 'Upper B', 'Lower C'],
};

const WARM_UP_SETS_NOTE = '2–3 light sets, 10 → 6 → 3';
const SECONDS_PER_SET = 45;
const SESSION_OVERHEAD_MINUTES = 8;
const COOL_DOWN_MINUTES = 5;
const LIGHT_EQUIPMENT: readonly Equipment[] = ['Bands', 'Dumbbells'];
const MAX_SUBSTITUTIONS = 2;

export function suggestedBlocks(level: LevelHint): SuggestedBlock[] {
  return SUGGESTED_BLOCKS[level].map(block => ({ ...block }));
}

export function splitShapeFor(days: number): SplitShape {
  return days <= 3 ? 'full-body' : 'upper-lower';
}

export function sessionNamesFor(shape: SplitShape, days: number): string[] {
  return SESSION_NAMES[shape].slice(0, days);
}

export function spreadCalendar(
  sessionIds: string[],
  cardio: CardioSession[],
): Record<Weekday, CalendarEntry> {
  const calendar = Object.fromEntries(WEEKDAYS.map(day => [day, { kind: 'rest' }])) as Record<
    Weekday,
    CalendarEntry
  >;
  const spaced = sessionIds.length * 2 - 1 <= WEEKDAYS.length;
  const sessionDays = sessionIds.map((_, index) => WEEKDAYS[spaced ? index * 2 : index]);
  sessionIds.forEach((sessionId, index) => {
    calendar[sessionDays[index]] = { kind: 'session', sessionId };
  });
  const freeDays = WEEKDAYS.filter(day => !sessionDays.includes(day));
  cardio.forEach((session, index) => {
    if (index < freeDays.length) calendar[freeDays[index]] = { kind: 'cardio', cardioId: session.id };
  });
  return calendar;
}

function emptyRow(type: BlockType, slot: Slot, supersetGroup?: string): Row {
  return {
    id: newId(),
    exerciseId: '',
    slot,
    ...(supersetGroup === undefined ? {} : { supersetGroup }),
    ...rowDefaults(type, roleForSlot(slot)),
    lastSetTechnique: 'none',
    substitutions: [],
    progression: { kind: 'double' },
    cues: '',
    touched: [],
  };
}

function emptySession(name: string, type: BlockType): Session {
  const id = newId();
  const group = newId();
  const slots: [Slot, string | undefined][] = [['A', undefined], ['B', undefined], ['C', group], ['C', group]];
  if (type === 'hypertrophy') slots.push(['D', undefined]);
  return {
    id,
    originId: id,
    name,
    warmUp: { mobilityExerciseIds: [], warmUpSetsNote: WARM_UP_SETS_NOTE },
    coolDown: false,
    rows: slots.map(([slot, supersetGroup]) => emptyRow(type, slot, supersetGroup)),
  };
}

export function emptySessionsFor(shape: SplitShape, days: number, type: BlockType): Session[] {
  return sessionNamesFor(shape, days).map(name => emptySession(name, type));
}

function copiedSessions(sessions: Session[]): Session[] {
  return sessions.map(session => ({
    ...session,
    id: newId(),
    rows: session.rows.map(row => ({ ...row, id: newId() })),
  }));
}

export function newBlock(
  type: BlockType,
  weeks: number,
  setup: ProgramSetup,
  language: ProgramLanguage,
  previous?: Block,
): Block {
  const shape = splitShapeFor(setup.trainingDays);
  const sessions = previous ? copiedSessions(previous.sessions) : emptySessionsFor(shape, setup.trainingDays, type);
  const cardioSessions = cardioDefaults(type);
  const block: Block = {
    id: newId(),
    originId: newId(),
    type,
    weeks,
    calibrationWeek: false,
    introText: templateText(`block.${type}`, language).text,
    clientNote: '',
    split: previous
      ? { ...previous.split }
      : {
          shape,
          name: '',
          text: fillTemplate(templateText(`split.${shape}`, language).text, { days: setup.trainingDays }),
        },
    targetMinutes: setup.sessionMinutes,
    calendar: spreadCalendar(
      sessions.map(session => session.id),
      cardioSessions,
    ),
    sessions,
    cardioSessions,
    dailySteps: setup.dailySteps,
    missedDayNote: templateText('missedDay', language).text,
  };
  return previous ? reDefaultedBlock(block, type) : block;
}

export function initialContent(setup: ProgramSetup): ProgramContent {
  const blocks: Block[] = [];
  for (const suggestion of suggestedBlocks(setup.level)) {
    const block = newBlock(suggestion.type, suggestion.weeks, setup, setup.language, blocks.at(-1));
    blocks.push({ ...block, calibrationWeek: suggestion.calibrationWeek });
  }
  return {
    header: { title: 'Program — weeks 1–2', focus: '', personalNote: '' },
    plan: { blocks },
    cycleRules: [],
    nutritionNotes: '',
    lifestyleNotes: '',
  };
}

export function estimatedMinutes(session: Session): number {
  const supersetsSeen = new Set<string>();
  let seconds = 0;
  for (const row of session.rows) {
    if (row.supersetGroup === undefined) {
      seconds += row.sets * (SECONDS_PER_SET + row.restSeconds);
    } else if (!supersetsSeen.has(row.supersetGroup)) {
      supersetsSeen.add(row.supersetGroup);
      seconds += row.sets * (2 * SECONDS_PER_SET + row.restSeconds);
    }
  }
  const coolDown = session.coolDown ? COOL_DOWN_MINUTES : 0;
  return Math.round(SESSION_OVERHEAD_MINUTES + seconds / 60 + coolDown);
}

function isLight(exercise: Exercise): boolean {
  return exercise.equipment.every(item => LIGHT_EQUIPMENT.includes(item));
}

function pickPair(candidates: Exercise[]): Exercise[] {
  const light = candidates.find(isLight);
  const heavy = candidates.find(candidate => !isLight(candidate));
  const picked = [light, heavy].filter((candidate): candidate is Exercise => candidate !== undefined);
  const rest = candidates.filter(candidate => !picked.includes(candidate));
  return [...picked, ...rest].slice(0, MAX_SUBSTITUTIONS);
}

export function substitutionsFor(
  exercise: Exercise,
  library: readonly Exercise[],
  equipment: readonly Equipment[],
): string[] {
  const candidates = library.filter(
    other =>
      other.id !== exercise.id &&
      other.archivedAt === undefined &&
      other.pattern !== undefined &&
      other.pattern === exercise.pattern &&
      other.primaryMuscles.some(muscle => exercise.primaryMuscles.includes(muscle)),
  );
  const owned = candidates.filter(candidate => candidate.equipment.every(item => equipment.includes(item)));
  const others = candidates.filter(candidate => !owned.includes(candidate));
  const picks = pickPair(owned);
  const remaining = MAX_SUBSTITUTIONS - picks.length;
  return [...picks, ...pickPair(others).slice(0, remaining)].map(pick => pick.id);
}
