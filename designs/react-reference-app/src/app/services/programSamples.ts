import type { Exercise } from '../context/TrainingContext';
import type { CycleMode } from '../domain/cycleMode';
import type { Equipment } from '../domain/exercises';
import {
  contentWithFreshIds,
  newId,
  roleForSlot,
  SLOTS,
  type Block,
  type Program,
  type ProgramContent,
  type Row,
  type Session,
} from '../domain/program';
import type { ProgramSetup } from '../domain/programOnboarding';
import { cardioPreset } from '../domain/programCardio';
import { emptyRow, initialContent, substitutionsFor } from '../domain/programSuggestions';
import { slotPlanFor, type SlotPlan } from '../domain/splitTemplates';

export const PROGRAM_SEEDS = ['none', 'draft', 'published', 'two-versions'] as const;
export type ProgramSeed = (typeof PROGRAM_SEEDS)[number];

const SEED_SETUP: ProgramSetup = {
  goal: 'Lose fat',
  level: 'beginner',
  trainingDays: 3,
  sessionMinutes: 60,
  cycleMode: 'adapted',
  language: 'en',
  dailySteps: 6000,
  equipment: [],
  splitShape: 'full-body',
};

export type SeedClient = { callId: string; dayOne: Date | null; cycleMode: CycleMode; equipment: Equipment[] };

const TWO_VERSIONS_WHAT_CHANGED =
  'Added a second lower day and raised steps to 8,000, because your technique is stable and energy is good.';

function candidateFor(plan: SlotPlan, library: readonly Exercise[], used: ReadonlySet<string>): Exercise | undefined {
  const candidates = library.filter(
    exercise =>
      exercise.type === 'resistance' &&
      exercise.archivedAt === undefined &&
      exercise.pattern !== undefined &&
      plan.patterns.includes(exercise.pattern) &&
      !used.has(exercise.id),
  );
  return candidates.find(exercise => exercise.role === roleForSlot(plan.slot)) ?? candidates[0];
}

type SeedContext = { block: Block; library: readonly Exercise[]; equipment: readonly Equipment[] };

function seededRow(plan: SlotPlan, exercise: Exercise, seed: SeedContext, supersetGroup?: string): Row {
  return {
    ...emptyRow(seed.block.type, plan.slot, supersetGroup),
    exerciseId: exercise.id,
    cues: exercise.cues,
    substitutions: substitutionsFor(exercise, seed.library, seed.equipment),
  };
}

function rowsForSlot(plan: SlotPlan, seed: SeedContext, used: Set<string>): Row[] {
  const picks: Exercise[] = [];
  for (let count = plan.slot === 'C' ? 2 : 1; count > 0; count -= 1) {
    const exercise = candidateFor(plan, seed.library, used);
    if (!exercise) break;
    used.add(exercise.id);
    picks.push(exercise);
  }
  const supersetGroup = picks.length > 1 ? newId() : undefined;
  return picks.map(exercise => seededRow(plan, exercise, seed, supersetGroup));
}

function filledSession(session: Session, seed: SeedContext): Session {
  const used = new Set<string>();
  const plans = SLOTS.flatMap(slot => slotPlanFor(seed.block, session, slot) ?? []);
  return { ...session, rows: plans.flatMap(plan => rowsForSlot(plan, seed, used)) };
}

function filledContent(library: readonly Exercise[], client: SeedClient): ProgramContent {
  const content = initialContent({ ...SEED_SETUP, cycleMode: client.cycleMode, equipment: client.equipment }, library);
  return {
    ...content,
    plan: {
      blocks: content.plan.blocks.map(block => {
        const seed = { block, library, equipment: client.equipment };
        return { ...block, sessions: block.sessions.map(session => filledSession(session, seed)) };
      }),
    },
  };
}

function programOf(client: SeedClient, versions: Program['versions']): Program {
  return {
    callId: client.callId,
    goal: SEED_SETUP.goal,
    equipment: client.equipment,
    language: SEED_SETUP.language,
    cycleMode: client.cycleMode,
    level: SEED_SETUP.level,
    versions,
  };
}

function withIntervalsDay(content: ProgramContent, library: readonly Exercise[]): ProgramContent {
  const [first, ...rest] = content.plan.blocks;
  const replaced = first.cardioSessions.at(-1);
  if (!replaced) return content;
  const intervals = { ...cardioPreset('hiit', library), id: replaced.id, originId: replaced.originId };
  const cardioSessions = first.cardioSessions.map(cardio => (cardio.id === replaced.id ? intervals : cardio));
  return { ...content, plan: { blocks: [{ ...first, cardioSessions }, ...rest] } };
}

const SUGGESTED_MAIN_LIFT_KG = 40;

function withSuggestedMainLiftWeights(block: Block): Block {
  const weighted = (row: Row): Row =>
    row.slot === 'A' ? { ...row, sets: row.sets.map(set => (set.kind === 'working' ? { ...set, weightKg: SUGGESTED_MAIN_LIFT_KG } : set)) } : row;
  return { ...block, sessions: block.sessions.map(session => ({ ...session, rows: session.rows.map(weighted) })) };
}

function twoVersions(client: SeedClient, publishedAt: Date, content: ProgramContent): Program {
  const [first, ...rest] = content.plan.blocks;
  const raised: ProgramContent = {
    ...content,
    plan: { blocks: [withSuggestedMainLiftWeights({ ...first, dailySteps: 8000 }), ...rest] },
  };
  return programOf(client, [
    { number: 1, state: 'superseded', publishedAt, whatChanged: '', content },
    { number: 2, state: 'published', publishedAt, whatChanged: TWO_VERSIONS_WHAT_CHANGED, content: raised },
    { number: 3, state: 'draft', publishedAt: null, whatChanged: '', content: contentWithFreshIds(raised) },
  ]);
}

export function programForSeed(seed: ProgramSeed, client: SeedClient, library: readonly Exercise[]): Program | null {
  if (seed === 'none') return null;
  const content = filledContent(library, client);
  const publishedAt = client.dayOne ?? new Date();
  if (seed === 'draft') {
    return programOf(client, [{ number: 1, state: 'draft', publishedAt: null, whatChanged: '', content }]);
  }
  if (seed === 'published') {
    return programOf(client, [{ number: 1, state: 'published', publishedAt, whatChanged: '', content }]);
  }
  return twoVersions(client, publishedAt, withIntervalsDay(content, library));
}
