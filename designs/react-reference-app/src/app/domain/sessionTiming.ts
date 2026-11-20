import type { Exercise } from '../context/TrainingContext';
import { isWorkingSet, type Block, type LevelHint, type Range, type Session, type WarmUpItem, type WeekRow, type WeekSession } from './program';
import { sessionAtWeek } from './programProgression';

type Exercises = ReadonlyMap<string, Exercise>;
type Amount = { range: Range; timed: boolean };

const SECONDS_PER_REP = 4;
const WARM_UP_SET_REST_SECONDS = 60;
const EXERCISE_SETUP_SECONDS = 60;
const ROUTINE_ITEM_TRANSITION_SECONDS = 15;
const SECONDS_PER_MINUTE = 60;
const OVER_TARGET_TOLERANCE_MINUTES = 10;

function amountSeconds({ range, timed }: Amount, exercise: Exercise | undefined): number {
  const middle = (range.min + range.max) / 2;
  const sides = exercise?.perSide ? 2 : 1;
  return (timed ? middle : middle * SECONDS_PER_REP) * sides;
}

function rowSeconds(row: WeekRow, exercises: Exercises): number {
  const exercise = exercises.get(row.exerciseId);
  const timed = exercise?.measuredIn === 'time';
  const work = row.sets.reduce((total, set) => total + amountSeconds({ range: set.reps, timed }, exercise), 0);
  const warmUpRests = row.sets.filter(set => !isWorkingSet(set)).length * WARM_UP_SET_REST_SECONDS;
  return EXERCISE_SETUP_SECONDS + work + warmUpRests;
}

function unitSeconds(rows: readonly WeekRow[], exercises: Exercises): number {
  const rounds = Math.max(...rows.map(row => row.sets.filter(isWorkingSet).length));
  const rest = Math.max(...rows.map(row => row.restSeconds));
  const work = rows.reduce((total, row) => total + rowSeconds(row, exercises), 0);
  return work + Math.max(0, rounds - 1) * rest;
}

function exerciseUnits(rows: readonly WeekRow[]): WeekRow[][] {
  const units = new Map<string, WeekRow[]>();
  for (const row of rows) {
    const key = row.supersetGroup ?? row.id;
    units.set(key, [...(units.get(key) ?? []), row]);
  }
  return [...units.values()];
}

function warmUpAmount(item: WarmUpItem): Amount {
  if (item.seconds !== undefined) return { range: { min: item.seconds, max: item.seconds }, timed: true };
  return { range: item.reps ?? { min: 0, max: 0 }, timed: false };
}

function warmUpSeconds(session: WeekSession, exercises: Exercises): number {
  return session.warmUp.items.reduce(
    (total, item) => total + ROUTINE_ITEM_TRANSITION_SECONDS + item.sets * amountSeconds(warmUpAmount(item), exercises.get(item.exerciseId)),
    0,
  );
}

function coolDownSeconds(session: WeekSession, exercises: Exercises): number {
  if (!session.coolDown.enabled) return 0;
  return session.coolDown.items.reduce(
    (total, item) => total + ROUTINE_ITEM_TRANSITION_SECONDS + amountSeconds({ range: { min: item.seconds, max: item.seconds }, timed: true }, exercises.get(item.exerciseId)),
    0,
  );
}

/** One week of a session, as the client reads it. */
export function estimatedMinutes(session: WeekSession, exercises: Exercises): number {
  const main = exerciseUnits(session.rows).reduce((total, unit) => total + unitSeconds(unit, exercises), 0);
  const seconds = warmUpSeconds(session, exercises) + main + coolDownSeconds(session, exercises);
  return Math.round(seconds / SECONDS_PER_MINUTE);
}

export function estimatedDuration(minutes: number): string {
  return minutes === 0 ? '0 min' : `~${minutes} min`;
}

export type TimingContext = { block: Block; level: LevelHint; exercises: Exercises };

/** A session's working sets may differ by week, so the builder times it by its longest week. */
export function longestWeekOf(session: Session, { block, level, exercises }: TimingContext): WeekSession {
  const weeks = Array.from({ length: Math.max(1, block.weeks) }, (_, index) => sessionAtWeek(session, index + 1, { block, level, exercisesById: exercises }));
  return weeks.reduce((longest, week) => (estimatedMinutes(week, exercises) > estimatedMinutes(longest, exercises) ? week : longest));
}

export function longestWeekMinutes(session: Session, context: TimingContext): number {
  return estimatedMinutes(longestWeekOf(session, context), context.exercises);
}

export function isOverTarget(session: Session, context: TimingContext): boolean {
  return longestWeekMinutes(session, context) > context.block.targetMinutes + OVER_TARGET_TOLERANCE_MINUTES;
}
