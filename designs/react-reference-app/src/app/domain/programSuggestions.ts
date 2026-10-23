import type { Equipment } from './exercises';
import {
  blockWithFreshIds,
  copiedSessions,
  mapCalendar,
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
  type SetSpec,
  type Slot,
  type SplitShape,
  type Weekday,
} from './program';
import type { ProgramSetup } from './programOnboarding';
import { cardioDefaults, reDefaultedBlock, rowDefaults } from './programDefaults';
import { fillTemplate, templateText } from './programTemplates';
import { SPLIT_TEMPLATES } from './splitTemplates';
import { substitutionsFor } from './substitutions';
import type { Exercise } from '../context/TrainingContext';

type SuggestedBlock = { type: BlockType; weeks: number; calibrationWeek: boolean };
export type BlockContext = { setup: ProgramSetup; library: readonly Exercise[]; previous?: Block };

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

const MAIN_COMPOUND_WARM_UPS: readonly SetSpec[] = [
  { kind: 'warm-up', reps: { min: 8, max: 8 } },
  { kind: 'warm-up', reps: { min: 5, max: 5 } },
];

export function suggestedBlocks(level: LevelHint): SuggestedBlock[] {
  return SUGGESTED_BLOCKS[level].map(block => ({ ...block }));
}

export function splitShapeFor(days: number): SplitShape {
  return days <= 3 ? 'full-body' : 'upper-lower';
}

export function spreadCalendar(
  shape: SplitShape,
  sessionIds: string[],
  cardio: CardioSession[],
): Record<Weekday, CalendarEntry> {
  const calendar = mapCalendar((): CalendarEntry => ({ kind: 'rest' }));
  const sessionDays = SPLIT_TEMPLATES[shape].layout(sessionIds.length);
  sessionIds.forEach((sessionId, index) => {
    calendar[sessionDays[index]] = { kind: 'session', sessionId };
  });
  const freeDays = WEEKDAYS.filter(day => !sessionDays.includes(day));
  cardio.forEach((session, index) => {
    if (index < freeDays.length) calendar[freeDays[index]] = { kind: 'cardio', cardioId: session.id };
  });
  return calendar;
}

function warmUpsFor(slot: Slot): SetSpec[] {
  return roleForSlot(slot) === 'main-compound' ? MAIN_COMPOUND_WARM_UPS.map(set => structuredClone(set)) : [];
}

export type RowContext = { blockType: BlockType; library: readonly Exercise[]; equipment: readonly Equipment[] };
export type RowPlacement = { slot: Slot; supersetGroup?: string };

export function emptyRow(type: BlockType, slot: Slot, supersetGroup?: string): Row {
  const defaults = rowDefaults(type, roleForSlot(slot));
  return {
    id: newId(),
    exerciseId: '',
    slot,
    ...(supersetGroup === undefined ? {} : { supersetGroup }),
    sets: [...warmUpsFor(slot), ...defaults.sets],
    restSeconds: defaults.restSeconds,
    lastSetTechnique: 'none',
    substitutions: [],
    progression: { kind: 'double' },
    cues: '',
    touched: [],
  };
}

export function filledRow(exercise: Exercise, { slot, supersetGroup }: RowPlacement, context: RowContext): Row {
  return {
    ...emptyRow(context.blockType, slot, supersetGroup),
    exerciseId: exercise.id,
    cues: exercise.cues,
    substitutions: substitutionsFor(exercise, context.library, context.equipment),
  };
}

export function splitFor(shape: SplitShape, days: number, language: ProgramLanguage): Pick<Block['split'], 'shape' | 'text'> {
  return { shape, text: fillTemplate(templateText(`split.${shape}`, language).text, { days }) };
}

function emptySession(name: string): Session {
  const id = newId();
  return {
    id,
    originId: id,
    name,
    warmUp: { items: [] },
    coolDown: { enabled: false, note: '', items: [] },
    rows: [],
  };
}

export function emptySessionsFor(shape: SplitShape, days: number): Session[] {
  return SPLIT_TEMPLATES[shape].sessions(days).map(template => emptySession(template.name));
}

function blockTexts(type: BlockType, setup: ProgramSetup): Pick<Block, 'introText' | 'missedDayNote'> {
  return {
    introText: templateText(`block.${type}`, setup.language).text,
    missedDayNote: templateText('missedDay', setup.language).text,
  };
}

function deloadAfter(previous: Block, weeks: number, setup: ProgramSetup): Block {
  const copy = blockWithFreshIds(previous);
  return reDefaultedBlock(
    {
      ...copy,
      ...blockTexts('deload', setup),
      originId: newId(),
      weeks,
      calibrationWeek: false,
      clientNote: '',
      targetMinutes: setup.sessionMinutes,
      dailySteps: setup.dailySteps,
    },
    'deload',
  );
}

export function newBlock(type: BlockType, weeks: number, { setup, library, previous }: BlockContext): Block {
  if (type === 'deload' && previous) return deloadAfter(previous, weeks, setup);
  const shape = setup.splitShape;
  const sessions = previous ? copiedSessions(previous.sessions) : emptySessionsFor(shape, setup.trainingDays);
  const cardioSessions = cardioDefaults(type, library);
  const block: Block = {
    id: newId(),
    originId: newId(),
    type,
    weeks,
    trainingDays: previous?.trainingDays ?? setup.trainingDays,
    calibrationWeek: false,
    ...blockTexts(type, setup),
    clientNote: '',
    split: previous ? { ...previous.split } : { name: '', ...splitFor(shape, setup.trainingDays, setup.language) },
    targetMinutes: setup.sessionMinutes,
    calendar: spreadCalendar(
      previous?.split.shape ?? shape,
      sessions.map(session => session.id),
      cardioSessions,
    ),
    sessions,
    cardioSessions,
    dailySteps: setup.dailySteps,
  };
  return previous ? reDefaultedBlock(block, type) : block;
}

export function initialContent(setup: ProgramSetup, library: readonly Exercise[]): ProgramContent {
  const blocks: Block[] = [];
  for (const suggestion of suggestedBlocks(setup.level)) {
    const block = newBlock(suggestion.type, suggestion.weeks, { setup, library, previous: blocks.at(-1) });
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
