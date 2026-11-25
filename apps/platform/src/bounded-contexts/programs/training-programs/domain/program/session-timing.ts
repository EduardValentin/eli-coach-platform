import type { LibraryExercise } from "./library-exercise";
import type {
  Block,
  CardioSession,
  Range,
  Session,
  WarmUpItem,
} from "./program-content";
import {
  ProgramProgression,
  type WeekRow,
  type WeekSession,
} from "./program-progression";
import type { ClientLevel } from "./vocabulary";

type ExercisesById = ReadonlyMap<string, LibraryExercise>;
type Amount = { range: Range; timed: boolean };

export type TimingContext = {
  block: Block;
  level: ClientLevel;
  exercisesById: ExercisesById;
};

const SECONDS_PER_REP = 4;
const WARM_UP_SET_REST_SECONDS = 60;
const EXERCISE_SETUP_SECONDS = 60;
const ROUTINE_ITEM_TRANSITION_SECONDS = 15;
const SECONDS_PER_MINUTE = 60;
const OVER_TARGET_TOLERANCE_MINUTES = 10;

export class SessionTiming {
  /** One week of a session, as the client reads it. */
  static estimatedMinutes(
    session: WeekSession,
    exercisesById: ExercisesById,
  ): number {
    const main = SessionTiming.exerciseUnits(session.rows).reduce(
      (total, unit) => total + SessionTiming.unitSeconds(unit, exercisesById),
      0,
    );
    const seconds =
      SessionTiming.warmUpSeconds(session, exercisesById) +
      main +
      SessionTiming.coolDownSeconds(session, exercisesById);

    return Math.round(seconds / SECONDS_PER_MINUTE);
  }

  static estimatedDuration(minutes: number): string {
    return minutes === 0 ? "0 min" : `~${minutes} min`;
  }

  /** A session's working sets may differ by week, so the builder times it by its longest week. */
  static longestWeekOf(
    session: Session,
    { block, level, exercisesById }: TimingContext,
  ): WeekSession {
    const weeks = Array.from({ length: Math.max(1, block.weeks) }, (_, index) =>
      ProgramProgression.sessionAtWeek(session, index + 1, {
        block,
        level,
        exercisesById,
      }),
    );

    return weeks.reduce((longest, week) =>
      SessionTiming.estimatedMinutes(week, exercisesById) >
      SessionTiming.estimatedMinutes(longest, exercisesById)
        ? week
        : longest,
    );
  }

  static longestWeekMinutes(session: Session, context: TimingContext): number {
    return SessionTiming.estimatedMinutes(
      SessionTiming.longestWeekOf(session, context),
      context.exercisesById,
    );
  }

  static isOverTarget(session: Session, context: TimingContext): boolean {
    return (
      SessionTiming.longestWeekMinutes(session, context) >
      context.block.targetMinutes + OVER_TARGET_TOLERANCE_MINUTES
    );
  }

  static cardioMinutes(cardio: CardioSession): number {
    return Math.round(
      cardio.segments.reduce((total, segment) => total + segment.minutes, 0),
    );
  }

  private static amountSeconds(
    { range, timed }: Amount,
    exercise: LibraryExercise | undefined,
  ): number {
    const middle = (range.min + range.max) / 2;
    const sides = exercise?.perSide ? 2 : 1;

    return (timed ? middle : middle * SECONDS_PER_REP) * sides;
  }

  private static rowSeconds(
    row: WeekRow,
    exercisesById: ExercisesById,
  ): number {
    const exercise = exercisesById.get(row.exerciseId);
    const timed = exercise?.unit === "time";
    const work = row.sets.reduce(
      (total, set) =>
        total +
        SessionTiming.amountSeconds({ range: set.reps, timed }, exercise),
      0,
    );
    const warmUpRests =
      row.sets.filter((set) => set.kind === "warm-up").length *
      WARM_UP_SET_REST_SECONDS;

    return EXERCISE_SETUP_SECONDS + work + warmUpRests;
  }

  private static unitSeconds(
    rows: readonly WeekRow[],
    exercisesById: ExercisesById,
  ): number {
    const rounds = Math.max(
      ...rows.map(
        (row) => row.sets.filter((set) => set.kind === "working").length,
      ),
    );
    const rest = Math.max(...rows.map((row) => row.restSeconds));
    const work = rows.reduce(
      (total, row) => total + SessionTiming.rowSeconds(row, exercisesById),
      0,
    );

    return work + Math.max(0, rounds - 1) * rest;
  }

  private static exerciseUnits(rows: readonly WeekRow[]): WeekRow[][] {
    const units = new Map<string, WeekRow[]>();
    for (const row of rows) {
      const key = row.supersetGroup ?? row.id;
      units.set(key, [...(units.get(key) ?? []), row]);
    }

    return [...units.values()];
  }

  private static warmUpAmount(item: WarmUpItem): Amount {
    if (item.seconds !== undefined) {
      return { range: { min: item.seconds, max: item.seconds }, timed: true };
    }

    return { range: item.reps ?? { min: 0, max: 0 }, timed: false };
  }

  private static warmUpSeconds(
    session: WeekSession,
    exercisesById: ExercisesById,
  ): number {
    return session.warmUp.items.reduce(
      (total, item) =>
        total +
        ROUTINE_ITEM_TRANSITION_SECONDS +
        item.sets *
          SessionTiming.amountSeconds(
            SessionTiming.warmUpAmount(item),
            exercisesById.get(item.exerciseId),
          ),
      0,
    );
  }

  private static coolDownSeconds(
    session: WeekSession,
    exercisesById: ExercisesById,
  ): number {
    if (!session.coolDown.enabled) return 0;

    return session.coolDown.items.reduce(
      (total, item) =>
        total +
        ROUTINE_ITEM_TRANSITION_SECONDS +
        SessionTiming.amountSeconds(
          { range: { min: item.seconds, max: item.seconds }, timed: true },
          exercisesById.get(item.exerciseId),
        ),
      0,
    );
  }
}
