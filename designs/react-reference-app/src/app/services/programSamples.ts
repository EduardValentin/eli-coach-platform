import type { Exercise } from '../context/TrainingContext';
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
  type TypedTargets,
} from '../domain/program';
import type { ProgramSetup } from '../domain/programOnboarding';
import { cardioPreset } from '../domain/programCardio';
import { resolvedWeek, withSetAdded, withSetSwitched, withTypedTargets, type ProgressionContext } from '../domain/programProgression';
import { filledRow, initialContent } from '../domain/programSuggestions';
import { SPLIT_TEMPLATES, type SlotPlan } from '../domain/splitTemplates';
import { warmUpItem } from '../domain/warmUpEditing';

export const PROGRAM_SEEDS = ['none', 'draft', 'published', 'two-versions'] as const;
export type ProgramSeed = (typeof PROGRAM_SEEDS)[number];

const SEED_SETUP: ProgramSetup = {
  goal: 'Lose fat',
  level: 'beginner',
  trainingDays: 3,
  sessionMinutes: 60,
  language: 'en',
  dailySteps: 6000,
  splitShape: 'full-body',
};

export type SeedClient = { callId: string; dayOne: Date | null; equipment: Equipment[] };
export type SeedClients = { demo: SeedClient; awaitingReview: SeedClient };

export function seedRequiresProgramReady(seed: ProgramSeed): boolean {
  return seed !== 'none' && seed !== 'draft';
}

const TWO_VERSIONS_FOCUS = 'Build a strong base you can keep for life: good technique first, then weight.';
const TWO_VERSIONS_NOTE = "You've settled in well. This version adds a second lower day and more steps. Take the first week to find your weights.";

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
type SessionSeed = SeedContext & { used: Set<string> };
type Pick = { plan: SlotPlan; exercise: Exercise };

function picksFor(plan: SlotPlan, count: number, seed: SessionSeed): Pick[] {
  const picks: Pick[] = [];
  for (let remaining = count; remaining > 0; remaining -= 1) {
    const exercise = candidateFor(plan, seed.library, seed.used);
    if (!exercise) break;
    seed.used.add(exercise.id);
    picks.push({ plan, exercise });
  }
  return picks;
}

function rowsForSlot(plans: SlotPlan[], seed: SessionSeed): Row[] {
  const perPlan = plans.length === 1 && plans[0].slot === 'C' ? 2 : 1;
  const picks = plans.flatMap(plan => picksFor(plan, perPlan, seed));
  const supersetGroup = picks.length > 1 ? newId() : undefined;
  const context = { blockType: seed.block.type, library: seed.library, equipment: seed.equipment };
  return picks.map(({ plan, exercise }) => filledRow(exercise, { slot: plan.slot, supersetGroup }, context));
}

function seededWarmUp(library: readonly Exercise[]): Session['warmUp'] {
  const mobility = library.find(exercise => exercise.type === 'mobility' && exercise.archivedAt === undefined);
  return { items: mobility ? [warmUpItem(mobility, mobility.id)] : [] };
}

function filledSession(session: Session, seed: SeedContext): Session {
  const sessionSeed = { ...seed, used: new Set<string>() };
  const index = seed.block.sessions.indexOf(session);
  const template = SPLIT_TEMPLATES[seed.block.split.shape].sessions(seed.block.sessions.length)[index];
  const rows = SLOTS.flatMap(slot => rowsForSlot(template.slots.filter(plan => plan.slot === slot), sessionSeed));
  return { ...session, warmUp: seededWarmUp(seed.library), rows };
}

function filledContent(library: readonly Exercise[], client: SeedClient): ProgramContent {
  const content = initialContent(SEED_SETUP, library);
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
    language: SEED_SETUP.language,
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
const HYPERTROPHY_MAIN_LIFT_KG = 60;
const HYPERTROPHY_TYPED_WEEK = 4;
const HYPERTROPHY_TYPED_KG = 65;
const HYPERTROPHY_WARM_UP_KG: readonly number[] = [30, 45];
const HYPERTROPHY_TOP_SET_WEEK = 5;
const HYPERTROPHY_TOP_SET: TypedTargets = { reps: { min: 4, max: 6 }, rir: 2, weightKg: 75 };
const HYPERTROPHY_TOP_SET_WARM_UP = { reps: { min: 3, max: 3 }, rir: 3, weightKg: 60 };

function withMainLifts(block: Block, edit: (row: Row) => Row): Block {
  const edited = (row: Row): Row => (row.slot === 'A' ? edit(row) : row);
  return { ...block, sessions: block.sessions.map(session => ({ ...session, rows: session.rows.map(edited) })) };
}

function withSuggestedMainLiftWeights(block: Block, weightKg: number): Block {
  return withMainLifts(block, row => ({
    ...row,
    startSets: row.startSets.map(set => (set.kind === 'working' ? { ...set, start: { ...set.start, weightKg } } : set)),
  }));
}

function withWarmUpWeights(row: Row): Row {
  const warmUps = row.startSets.filter(set => set.kind === 'warm-up');
  const startSets = row.startSets.map(set => {
    const weightKg = HYPERTROPHY_WARM_UP_KG.at(warmUps.indexOf(set));
    return set.kind === 'warm-up' && weightKg !== undefined ? { ...set, start: { ...set.start, weightKg } } : set;
  });
  return { ...row, startSets };
}

function withTypedWeekWeight(row: Row): Row {
  return row.startSets
    .filter(set => set.kind === 'working')
    .reduce((typed, set) => withTypedTargets(typed, { week: HYPERTROPHY_TYPED_WEEK, setId: set.id }, { weightKg: HYPERTROPHY_TYPED_KG }), row);
}

/** In week 5 the first working set is a heavier top set, with one more warm-up set before it; the other weeks stay as suggested. */
function withTopSet(row: Row, context: ProgressionContext): Row {
  const [top] = row.startSets.filter(set => set.kind === 'working');
  const typed = withTypedTargets(row, { week: HYPERTROPHY_TOP_SET_WEEK, setId: top.id }, HYPERTROPHY_TOP_SET);
  const added = withSetAdded(typed, HYPERTROPHY_TOP_SET_WEEK, context);
  const extra = resolvedWeek(added, HYPERTROPHY_TOP_SET_WEEK, context).sets.at(-1);
  if (!extra) return typed;
  const at = { week: HYPERTROPHY_TOP_SET_WEEK, setId: extra.setId };
  return withTypedTargets(withSetSwitched(added, at), at, HYPERTROPHY_TOP_SET_WARM_UP);
}

/** Only the first and last rows carry words of their own; the rest hold their targets on the same custom rule without repeating them. */
const HELD_FIRST_ROW_RULE = 'Same weight every week while you learn the lift; add 2.5 kg once all your sets move cleanly at the RIR shown.';
const HELD_LAST_ROW_RULE = 'Once the last set feels easy, choose a harder version before adding time or reps.';

function heldRuleText(index: number, count: number): string {
  if (index === 0) return HELD_FIRST_ROW_RULE;
  return index === count - 1 ? HELD_LAST_ROW_RULE : '';
}

function heldRow(row: Row, index: number, rows: readonly Row[]): Row {
  return { ...row, progression: { kind: 'custom', text: heldRuleText(index, rows.length) } };
}

function withLastSessionHeld(block: Block): Block {
  const held = block.sessions.at(-1);
  const sessions = block.sessions.map(session => (session === held ? { ...session, rows: session.rows.map(heldRow) } : session));
  return { ...block, sessions };
}

function publishedSeedBlock(block: Block): Block {
  if (block.type === 'foundation') return withLastSessionHeld(block);
  if (block.type !== 'hypertrophy') return block;
  const context = { block, level: SEED_SETUP.level };
  const typed = withMainLifts(withSuggestedMainLiftWeights(block, HYPERTROPHY_MAIN_LIFT_KG), row => withTopSet(withTypedWeekWeight(withWarmUpWeights(row)), context));
  return { ...typed, calibrationWeek: true };
}

/** Weekly targets of every kind for the published seed: rising, typed, held by a custom rule, found in a calibration week, and one week with a top set and its own extra warm-up set. */
function withWeeklyTargets(content: ProgramContent): ProgramContent {
  return { ...content, plan: { blocks: content.plan.blocks.map(publishedSeedBlock) } };
}

function twoVersions(client: SeedClient, publishedAt: Date, content: ProgramContent): Program {
  const [first, ...rest] = content.plan.blocks;
  const raised: ProgramContent = {
    ...content,
    header: { ...content.header, focus: TWO_VERSIONS_FOCUS, personalNote: TWO_VERSIONS_NOTE },
    plan: { blocks: [withSuggestedMainLiftWeights({ ...first, dailySteps: 8000 }, SUGGESTED_MAIN_LIFT_KG), ...rest] },
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
    return programOf(client, [{ number: 1, state: 'published', publishedAt, whatChanged: '', content: withWeeklyTargets(content) }]);
  }
  return twoVersions(client, publishedAt, withIntervalsDay(content, library));
}

export function seededPrograms(seed: ProgramSeed, clients: SeedClients, library: readonly Exercise[]): Record<string, Program> {
  const demo = programForSeed(seed, clients.demo, library);
  const reference = seed === 'two-versions' ? programForSeed('published', clients.awaitingReview, library) : null;
  return {
    ...(demo ? { [clients.demo.callId]: demo } : {}),
    ...(reference ? { [clients.awaitingReview.callId]: reference } : {}),
  };
}
