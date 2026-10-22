import { addDays, differenceInCalendarDays, format, isAfter, max, startOfDay } from 'date-fns';
import type { Exercise } from '../context/TrainingContext';
import type { Muscle } from './exercises';
import {
  BLOCK_TYPE_LABELS,
  WEEKDAYS,
  type Block,
  type CardioSession,
  type LevelHint,
  type ProgramContent,
  type Session,
  type Weekday,
} from './program';
import { blockDates, blockSpan, currentPosition, nextCheckpoint } from './programCalendar';
import { hasHardRounds, isLightCardio } from './programCardio';
import { estimatedMinutes } from './programSuggestions';
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

type Exercises = ReadonlyMap<string, Exercise>;

const DAYS_PER_WEEK = 7;
const MINIMUM_CONTENT_DAYS = 14;
const MAX_WEEKS_WITHOUT_DELOAD = 8;
const MAX_HIIT_SESSIONS = 2;
const TARGET_MINUTES_TOLERANCE = 10;

export const LARGE_MUSCLE_GROUPS: readonly Muscle[][] = [
  ['Chest'],
  ['Upper back', 'Lats'],
  ['Shoulders'],
  ['Glutes'],
  ['Quadriceps'],
  ['Hamstrings'],
];
const LARGE_MUSCLE_GROUP_LABELS = ['Chest', 'Back', 'Shoulders', 'Glutes', 'Quadriceps', 'Hamstrings'];
const HEAVY_LEG_MUSCLES: readonly Muscle[] = ['Glutes', 'Quadriceps', 'Hamstrings'];
const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

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

export function minimumContentWindow(ctx: RuleContext): { from: Date; to: Date } {
  const checkpoint = nextCheckpoint(ctx.dayOne ?? ctx.publishDay, ctx.preferredWeekday, ctx.publishDay);
  return {
    from: ctx.publishDay,
    to: max([checkpoint, addDays(ctx.publishDay, MINIMUM_CONTENT_DAYS)]),
  };
}

function sequenceProblems(blocks: readonly Block[]): RuleFinding<BlockingCode>[] {
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

function referencedSessions(block: Block): Session[] {
  const ids = new Set(
    Object.values(block.calendar).flatMap(entry => (entry.kind === 'session' ? [entry.sessionId] : [])),
  );
  return block.sessions.filter(session => ids.has(session.id));
}

function hasEmptyCardioDay(block: Block): boolean {
  const ids = new Set(Object.values(block.calendar).flatMap(entry => (entry.kind === 'cardio' ? [entry.cardioId] : [])));
  return block.cardioSessions.some(cardio => ids.has(cardio.id) && cardio.segments.length === 0);
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
    const hasEmptySession =
      referencedSessions(block).some(session => !session.rows.some(row => row.exerciseId !== '')) || hasEmptyCardioDay(block);
    if (!overlaps || !hasEmptySession) return [];
    return [
      {
        code: 'missing-sessions' as const,
        blockId: block.id,
        detail: `${BLOCK_TYPE_LABELS[block.type]} block ${index + 1}`,
      },
    ];
  });
}

export function blockShorterThanElapsed(
  draftBlocks: readonly Block[],
  publishedBlocks: readonly Block[] | null,
  dayOne: Date | null,
  today: Date,
): RuleFinding<BlockingCode>[] {
  if (!publishedBlocks || !dayOne) return [];
  const position = currentPosition(publishedBlocks, dayOne, today);
  if (position.status !== 'in-plan') return [];
  const weekOfPlan = Math.floor(differenceInCalendarDays(today, dayOne) / DAYS_PER_WEEK) + 1;
  const weekOfBlock = weekOfPlan - blockSpan(publishedBlocks, position.blockIndex).startWeek + 1;
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
    ...blockShorterThanElapsed(blocks, ctx.publishedBlocks, ctx.dayOne, ctx.publishDay),
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

export function isHeavyLegSession(session: Session, exercisesById: Exercises): boolean {
  return session.rows
    .filter(row => row.slot === 'A')
    .some(row => primaryMusclesOf(row.exerciseId, exercisesById).some(muscle => HEAVY_LEG_MUSCLES.includes(muscle)));
}

function sessionOn(block: Block, day: Weekday): Session | undefined {
  const entry = block.calendar[day];
  return entry.kind === 'session' ? block.sessions.find(session => session.id === entry.sessionId) : undefined;
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

function cardioOn(block: Block, day: Weekday): CardioSession | undefined {
  const entry = block.calendar[day];
  return entry.kind === 'cardio' ? block.cardioSessions.find(cardio => cardio.id === entry.cardioId) : undefined;
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
        detail: `${WEEKDAY_LABELS[day]} and ${WEEKDAY_LABELS[following]}`,
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

function sessionWarnings(block: Block, exercises: Exercises): RuleFinding<WarningCode>[] {
  return block.sessions.flatMap(session => {
    const findings: RuleFinding<WarningCode>[] = [];
    session.rows.forEach((row, index) => {
      const exercise = exercises.get(row.exerciseId);
      const planned = slotPlanFor(block, session, row.slot)?.patterns;
      if (exercise?.pattern && planned && !planned.includes(exercise.pattern)) {
        findings.push({ code: 'role-slot-mismatch', blockId: block.id, sessionId: session.id, detail: exercise.name });
      }
      const sharesMuscle = session.rows.slice(index + 1).some(
        other =>
          row.supersetGroup !== undefined &&
          other.slot === row.slot &&
          other.supersetGroup === row.supersetGroup &&
          primaryMusclesOf(other.exerciseId, exercises).some(muscle =>
            primaryMusclesOf(row.exerciseId, exercises).includes(muscle),
          ),
      );
      if (sharesMuscle) {
        findings.push({ code: 'superset-same-muscle', blockId: block.id, sessionId: session.id, detail: session.name });
      }
    });
    const minutes = estimatedMinutes(session);
    if (minutes > block.targetMinutes + TARGET_MINUTES_TOLERANCE) {
      findings.push({
        code: 'session-over-target',
        blockId: block.id,
        sessionId: session.id,
        detail: `${session.name}, ${minutes} min`,
      });
    }
    return findings;
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
