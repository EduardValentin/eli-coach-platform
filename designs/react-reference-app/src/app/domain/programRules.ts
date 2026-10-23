import { addDays, format, isAfter, max, startOfDay } from 'date-fns';
import type { Exercise } from '../context/TrainingContext';
import { canStartWork, workStartDate } from './coachingSubscription';
import type { Muscle } from './exercises';
import type { ClientJourney } from './journey';
import {
  BLOCK_TYPE_LABELS,
  cardioOn,
  currentVersion,
  hasExercises,
  scheduledSessions,
  sessionOn,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type Block,
  type LevelHint,
  type Program,
  type ProgramContent,
  type ProgramVersion,
  type Row,
  type Session,
  type Weekday,
} from './program';
import { blockDates, checkInWeekdayOf, currentPosition, dayOneOf, nextCheckpoint } from './programCalendar';
import { hasHardRounds, isLightCardio } from './programCardio';
import { estimatedMinutes, isOverTarget } from './sessionTiming';
import { slotPlanFor } from './splitTemplates';

export type BlockingCode =
  | 'foundation-not-first'
  | 'starts-with-deload'
  | 'consecutive-deloads'
  | 'deload-not-one-week'
  | 'missing-sessions'
  | 'what-changed-missing'
  | 'start-date-not-reached'
  | 'details-pending'
  | 'block-shorter-than-elapsed';

export type WarningCode =
  | 'no-deload-8-weeks'
  | 'strength-for-beginner'
  | 'muscle-under-twice'
  | 'hard-days-in-a-row'
  | 'hiit-before-heavy-legs'
  | 'hiit-over-two'
  | 'superset-same-muscle'
  | 'role-slot-mismatch'
  | 'session-over-target';

export type RuleFinding<Code> = { code: Code; blockId?: string; sessionId?: string; detail?: string };

export type RuleContext = {
  versionNumber: number;
  publishDay: Date;
  dayOne: Date | null;
  preferredWeekday: Weekday;
  level: LevelHint;
  startDate: Date | null;
  detailsPending: boolean;
  publishedBlocks: readonly Block[] | null;
  exercisesById: ReadonlyMap<string, Exercise>;
};

export type RuleInput = {
  journey: ClientJourney | null;
  program: Program;
  draft: ProgramVersion;
  today: Date;
  exercises: readonly Exercise[];
};

type Exercises = ReadonlyMap<string, Exercise>;
type ElapsedInput = { draftBlocks: readonly Block[]; publishedBlocks: readonly Block[] | null; dayOne: Date | null; today: Date };
type SessionPlace = { block: Block; session: Session };

const MINIMUM_CONTENT_DAYS = 14;
const MAX_WEEKS_WITHOUT_DELOAD = 8;
const MAX_HIIT_SESSIONS = 2;

const LARGE_MUSCLE_GROUPS: readonly Muscle[][] = [
  ['Chest'],
  ['Upper back', 'Lats'],
  ['Shoulders'],
  ['Glutes'],
  ['Quadriceps'],
  ['Hamstrings'],
];
const LARGE_MUSCLE_GROUP_LABELS = ['Chest', 'Back', 'Shoulders', 'Glutes', 'Quadriceps', 'Hamstrings'];
const HEAVY_LEG_MUSCLES: readonly Muscle[] = ['Glutes', 'Quadriceps', 'Hamstrings'];

const BLOCKING_MESSAGES: Record<BlockingCode, string> = {
  'foundation-not-first': 'Foundation must be the first block',
  'starts-with-deload': 'The plan cannot start with a Deload',
  'consecutive-deloads': 'Two Deloads cannot follow each other',
  'deload-not-one-week': 'A Deload lasts exactly one week',
  'missing-sessions': '{detail} has sessions without exercises before the next check-in form',
  'what-changed-missing': 'Say what changed and why',
  'start-date-not-reached': 'Publishing opens on {detail}',
  'details-pending': 'Answer or close the details request first',
  'block-shorter-than-elapsed': 'This block has already run {detail} weeks',
};

const WARNING_MESSAGES: Record<WarningCode, string> = {
  'no-deload-8-weeks': 'More than 8 weeks without a Deload',
  'strength-for-beginner': 'Strength for a client whose level is beginner',
  'muscle-under-twice': '{detail} is trained on fewer than 2 days',
  'hard-days-in-a-row': 'Two hard days in a row without rest or easy cardio ({detail})',
  'hiit-before-heavy-legs': 'HIIT the day before {detail}',
  'hiit-over-two': 'More than 2 HIIT sessions a week',
  'superset-same-muscle': '{detail} supersets two exercises on the same muscle',
  'role-slot-mismatch': '{detail} does not match its slot',
  'session-over-target': '{detail} runs over the target',
};

function interpolate(template: string, detail: string | undefined): string {
  return template.replace('{detail}', detail ?? '');
}

export function blockingMessage(finding: RuleFinding<BlockingCode>): string {
  return interpolate(BLOCKING_MESSAGES[finding.code], finding.detail);
}

export function warningMessage(finding: RuleFinding<WarningCode>): string {
  return interpolate(WARNING_MESSAGES[finding.code], finding.detail);
}

export function ruleContextFor({ journey, program, draft, today, exercises }: RuleInput): RuleContext {
  const subscription = journey?.subscription;
  return {
    versionNumber: draft.number,
    publishDay: today,
    dayOne: dayOneOf(journey),
    preferredWeekday: checkInWeekdayOf(journey),
    level: program.level,
    startDate: subscription && !canStartWork(subscription, today) ? workStartDate(subscription) : null,
    detailsPending: journey?.stage === 'needs-details',
    publishedBlocks: currentVersion(program)?.content.plan.blocks ?? null,
    exercisesById: new Map(exercises.map(exercise => [exercise.id, exercise])),
  };
}

function minimumContentWindow(ctx: RuleContext): { from: Date; to: Date } {
  const checkpoint = nextCheckpoint(ctx.dayOne ?? ctx.publishDay, ctx.preferredWeekday, ctx.publishDay);
  return {
    from: ctx.publishDay,
    to: max([checkpoint, addDays(ctx.publishDay, MINIMUM_CONTENT_DAYS)]),
  };
}

export function sequenceProblems(blocks: readonly Block[]): RuleFinding<BlockingCode>[] {
  const findings: RuleFinding<BlockingCode>[] = [];
  if (blocks[0]?.type === 'deload') findings.push({ code: 'starts-with-deload' });
  blocks.forEach((block, index) => {
    if (block.type === 'foundation' && index > 0) findings.push({ code: 'foundation-not-first', blockId: block.id });
    if (block.type !== 'deload') return;
    if (blocks[index - 1]?.type === 'deload') findings.push({ code: 'consecutive-deloads', blockId: block.id });
    if (block.weeks !== 1) findings.push({ code: 'deload-not-one-week', blockId: block.id });
  });
  return findings;
}

export function hasUnfilledSessions(block: Block): boolean {
  return scheduledSessions(block).some(session => !hasExercises(session));
}

function hasEmptyCardioDay(block: Block): boolean {
  return WEEKDAYS.some(day => cardioOn(block, day)?.segments.length === 0);
}

function missingSessionProblems(
  blocks: readonly Block[],
  ctx: RuleContext,
): RuleFinding<BlockingCode>[] {
  const window = minimumContentWindow(ctx);
  const dayOne = ctx.dayOne ?? ctx.publishDay;
  return blocks.flatMap((block, index) => {
    const { start, end } = blockDates(blocks, index, dayOne);
    const overlaps = start <= window.to && end >= startOfDay(window.from);
    if (!overlaps || !(hasUnfilledSessions(block) || hasEmptyCardioDay(block))) return [];
    return [
      {
        code: 'missing-sessions' as const,
        blockId: block.id,
        detail: `${BLOCK_TYPE_LABELS[block.type]} block ${index + 1}`,
      },
    ];
  });
}

export function blockShorterThanElapsed({ draftBlocks, publishedBlocks, dayOne, today }: ElapsedInput): RuleFinding<BlockingCode>[] {
  if (!publishedBlocks || !dayOne) return [];
  const position = currentPosition(publishedBlocks, dayOne, today);
  if (position.status !== 'in-plan') return [];
  const { weekOfBlock } = position;
  const { originId } = publishedBlocks[position.blockIndex];
  const block = draftBlocks.find(other => other.originId === originId);
  if (block && block.weeks >= weekOfBlock) return [];
  return [{ code: 'block-shorter-than-elapsed', blockId: block?.id, detail: String(weekOfBlock - 1) }];
}

export function blockingProblems(
  content: ProgramContent,
  whatChanged: string,
  ctx: RuleContext,
): RuleFinding<BlockingCode>[] {
  const { blocks } = content.plan;
  const findings = [
    ...sequenceProblems(blocks),
    ...missingSessionProblems(blocks, ctx),
    ...blockShorterThanElapsed({ draftBlocks: blocks, publishedBlocks: ctx.publishedBlocks, dayOne: ctx.dayOne, today: ctx.publishDay }),
  ];
  if (ctx.versionNumber >= 2 && whatChanged.trim() === '') findings.push({ code: 'what-changed-missing' });
  if (ctx.startDate && isAfter(startOfDay(ctx.startDate), startOfDay(ctx.publishDay))) {
    findings.push({ code: 'start-date-not-reached', detail: format(ctx.startDate, 'd MMMM') });
  }
  if (ctx.detailsPending) findings.push({ code: 'details-pending' });
  return findings;
}

function primaryMusclesOf(exerciseId: string, exercises: Exercises): readonly Muscle[] {
  return exercises.get(exerciseId)?.primaryMuscles ?? [];
}

function isHeavyLegSession(session: Session, exercisesById: Exercises): boolean {
  return session.rows
    .filter(row => row.slot === 'A')
    .some(row => primaryMusclesOf(row.exerciseId, exercisesById).some(muscle => HEAVY_LEG_MUSCLES.includes(muscle)));
}

function weekdayAbbreviation(day: Weekday): string {
  return WEEKDAY_LABELS[day].slice(0, 3);
}

function nextDay(day: Weekday): Weekday {
  return WEEKDAYS[(WEEKDAYS.indexOf(day) + 1) % WEEKDAYS.length];
}

function runsOfNonDeloadWeeks(blocks: readonly Block[]): number[] {
  const runs: number[] = [0];
  for (const block of blocks) {
    if (block.type === 'deload') runs.push(0);
    else runs[runs.length - 1] += block.weeks;
  }
  return runs;
}

function planWarnings(blocks: readonly Block[], ctx: RuleContext): RuleFinding<WarningCode>[] {
  const findings: RuleFinding<WarningCode>[] = [];
  if (runsOfNonDeloadWeeks(blocks).some(weeks => weeks > MAX_WEEKS_WITHOUT_DELOAD)) {
    findings.push({ code: 'no-deload-8-weeks' });
  }
  if (ctx.level === 'beginner' && blocks.some(block => block.type === 'strength')) {
    findings.push({ code: 'strength-for-beginner' });
  }
  return findings;
}

function muscleFrequencyWarnings(block: Block, exercises: Exercises): RuleFinding<WarningCode>[] {
  return LARGE_MUSCLE_GROUPS.flatMap((group, index) => {
    const trainingDays = WEEKDAYS.filter(day =>
      sessionOn(block, day)?.rows.some(row =>
        primaryMusclesOf(row.exerciseId, exercises).some(muscle => group.includes(muscle)),
      ),
    ).length;
    if (trainingDays !== 1) return [];
    return [{ code: 'muscle-under-twice' as const, blockId: block.id, detail: LARGE_MUSCLE_GROUP_LABELS[index] }];
  });
}

function isHardDay(block: Block, day: Weekday): boolean {
  const cardio = cardioOn(block, day);
  return sessionOn(block, day) !== undefined || (cardio !== undefined && !isLightCardio(cardio));
}

function scheduleWarnings(block: Block, exercises: Exercises): RuleFinding<WarningCode>[] {
  const findings: RuleFinding<WarningCode>[] = [];
  for (const day of WEEKDAYS) {
    const following = nextDay(day);
    if (isHardDay(block, day) && isHardDay(block, following)) {
      findings.push({
        code: 'hard-days-in-a-row',
        blockId: block.id,
        detail: `${weekdayAbbreviation(day)} and ${weekdayAbbreviation(following)}`,
      });
    }
    const cardio = cardioOn(block, day);
    const legs = sessionOn(block, following);
    if (cardio && hasHardRounds(cardio) && legs && isHeavyLegSession(legs, exercises)) {
      findings.push({ code: 'hiit-before-heavy-legs', blockId: block.id, detail: legs.name });
    }
  }
  if (block.cardioSessions.filter(hasHardRounds).length > MAX_HIIT_SESSIONS) {
    findings.push({ code: 'hiit-over-two', blockId: block.id });
  }
  return findings;
}

function roleSlotWarning({ block, session }: SessionPlace, row: Row, exercises: Exercises): RuleFinding<WarningCode>[] {
  const exercise = exercises.get(row.exerciseId);
  const planned = slotPlanFor(block, session, row.slot)?.patterns;
  if (!exercise?.pattern || !planned || planned.includes(exercise.pattern)) return [];
  return [{ code: 'role-slot-mismatch', blockId: block.id, sessionId: session.id, detail: exercise.name }];
}

function sharesMuscleWithLaterPartner(row: Row, later: readonly Row[], exercises: Exercises): boolean {
  if (row.supersetGroup === undefined) return false;
  const muscles = primaryMusclesOf(row.exerciseId, exercises);
  return later.some(
    other =>
      other.slot === row.slot &&
      other.supersetGroup === row.supersetGroup &&
      primaryMusclesOf(other.exerciseId, exercises).some(muscle => muscles.includes(muscle)),
  );
}

function supersetMuscleWarning({ block, session }: SessionPlace, index: number, exercises: Exercises): RuleFinding<WarningCode>[] {
  if (!sharesMuscleWithLaterPartner(session.rows[index], session.rows.slice(index + 1), exercises)) return [];
  return [{ code: 'superset-same-muscle', blockId: block.id, sessionId: session.id, detail: session.name }];
}

function overTargetWarning({ block, session }: SessionPlace): RuleFinding<WarningCode>[] {
  if (!isOverTarget(session, block)) return [];
  return [{ code: 'session-over-target', blockId: block.id, sessionId: session.id, detail: `${session.name}, ${estimatedMinutes(session)} min` }];
}

function sessionWarnings(block: Block, exercises: Exercises): RuleFinding<WarningCode>[] {
  return block.sessions.flatMap(session => {
    const place = { block, session };
    const rowFindings = session.rows.flatMap((row, index) => [...roleSlotWarning(place, row, exercises), ...supersetMuscleWarning(place, index, exercises)]);
    return [...rowFindings, ...overTargetWarning(place)];
  });
}

function withoutDuplicates(findings: RuleFinding<WarningCode>[]): RuleFinding<WarningCode>[] {
  const seen = new Set<string>();
  return findings.filter(finding => {
    const key = `${finding.code}|${finding.detail ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function warnings(content: ProgramContent, ctx: RuleContext): RuleFinding<WarningCode>[] {
  const { blocks } = content.plan;
  return withoutDuplicates([
    ...planWarnings(blocks, ctx),
    ...blocks.flatMap(block => [
      ...muscleFrequencyWarnings(block, ctx.exercisesById),
      ...scheduleWarnings(block, ctx.exercisesById),
      ...sessionWarnings(block, ctx.exercisesById),
    ]),
  ]);
}
