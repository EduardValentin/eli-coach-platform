import type { ExerciseRole, LibraryExercise } from "./library-exercise";
import type {
  Block,
  ExerciseRow,
  PlannedSet,
  Range,
  Session,
  SetTargets,
} from "./program-content";
import { ProgramProgression, type ResolvedWeek } from "./program-progression";
import type { BlockType, ClientLevel, SetKind, Slot } from "./vocabulary";
import { PLATE_STEP, WeightSteps, type WeightStep } from "./weight-steps";

/** The block's defaults for a row's working sets, before they become one planned set each; `lastSetRir` is the last set's RIR when it differs. */
export type WorkingTargets = {
  count: number;
  reps: Range;
  rir: number;
  lastSetRir?: number;
  weightKg?: number;
};

export type RowDefaultTargets = { start: WorkingTargets; restSeconds: number };

export type LoadingBlockType = Exclude<BlockType, "deload">;

export type DeloadContext = {
  level: ClientLevel;
  libraryExercises: readonly LibraryExercise[];
};

export type BlockTypeChangeContext = DeloadContext & {
  previous: Block | undefined;
};

type RowDefaultsOptions = { newId: () => string };

type SetValues = Pick<PlannedSet, "kind" | "start">;

type DeloadedWeek = (
  row: ExerciseRow,
  sessionIndex: number,
  exercise: LibraryExercise | undefined,
) => ResolvedWeek;

type DeloadedRow = {
  row: ExerciseRow;
  sessionIndex: number;
  exercise: LibraryExercise | undefined;
};

type DeloadStart = {
  block: Block;
  previous: Block | undefined;
  level: ClientLevel;
};

type DeloadedRowsSource = {
  libraryExercises: readonly LibraryExercise[];
  weekOf: DeloadedWeek;
};

const FOUNDATION: RowDefaultTargets = {
  start: { count: 3, reps: { min: 12, max: 15 }, rir: 3 },
  restSeconds: 75,
};
const LOADING_RIR = { rir: 3, lastSetRir: 2 } as const;
const SECONDARY: RowDefaultTargets = {
  start: { count: 3, reps: { min: 8, max: 12 }, ...LOADING_RIR },
  restSeconds: 105,
};
const ISOLATION: RowDefaultTargets = {
  start: { count: 3, reps: { min: 10, max: 20 }, ...LOADING_RIR },
  restSeconds: 75,
};
const HYPERTROPHY_MAIN: RowDefaultTargets = {
  start: { count: 4, reps: { min: 6, max: 10 }, ...LOADING_RIR },
  restSeconds: 150,
};
const STRENGTH_MAIN: RowDefaultTargets = {
  start: { count: 4, reps: { min: 3, max: 6 }, ...LOADING_RIR },
  restSeconds: 150,
};

const ROLE_BY_SLOT: Record<Slot, ExerciseRole> = {
  A: "main-compound",
  B: "secondary-compound",
  C: "isolation",
  D: "isolation",
};

const DELOAD_RIR = 4;
const MAIN_COMPOUND_WARM_UP_REPS: readonly Range[] = [
  { min: 8, max: 8 },
  { min: 5, max: 5 },
];
const DELOAD_WEIGHT_FACTOR = 0.9;
const DELOAD_LARGEST_CUT = 0.2;

/** A row's defaults by block type and slot, and the rows a type change, a Deload or a new block re-default (Business Rule 34). */
export class RowDefaults {
  constructor(private readonly options: RowDefaultsOptions) {}

  static forSlot(type: BlockType, slot: Slot): RowDefaultTargets {
    return RowDefaults.forRole(type, ROLE_BY_SLOT[slot]);
  }

  /** The block's first week for a new row: the warm-up sets its slot calls for, then the default working sets. */
  defaultSets(type: BlockType, slot: Slot): PlannedSet[] {
    const { start } = RowDefaults.forSlot(type, slot);
    const warmUps = this.plannedSetsOf(
      "warm-up",
      RowDefaults.warmUpsFor(slot, start.rir),
    );

    return [
      ...warmUps,
      ...this.plannedSetsOf("working", RowDefaults.workingStarts(start)),
    ];
  }

  /** The block's defaults replace what the working sets start from; the warm-up sets and a typed rest stay. */
  defaultedRow(row: ExerciseRow, type: BlockType): ExerciseRow {
    const defaults = RowDefaults.forSlot(type, row.slot);
    const startSets = [
      ...row.startSets.filter((set) => set.kind === "warm-up"),
      ...this.workingStartsAt(row.startSets, defaults.start),
    ];

    return {
      ...row,
      startSets,
      restSeconds: row.touched.includes("restSeconds")
        ? row.restSeconds
        : defaults.restSeconds,
    };
  }

  reDefaultedBlock(block: Block, type: LoadingBlockType): Block {
    return {
      ...block,
      type,
      sessions: block.sessions.map((session) => ({
        ...session,
        rows: session.rows.map((row) => this.defaultedRow(row, type)),
      })),
    };
  }

  deloadedBlock(
    block: Block,
    { level, libraryExercises }: DeloadContext,
  ): Block {
    const sessions = this.withDeloadedRows(block, {
      libraryExercises,
      weekOf: (row, _session, exercise) =>
        ProgramProgression.resolvedWeek(row, block.weeks, {
          block,
          level,
          exercise,
        }),
    });

    return { ...block, type: "deload", sessions };
  }

  blockSwitchedToDeload(
    block: Block,
    { previous, level, libraryExercises }: BlockTypeChangeContext,
  ): Block {
    const sessions = this.withDeloadedRows(block, {
      libraryExercises,
      weekOf: (row, sessionIndex, exercise) =>
        RowDefaults.deloadStartWeek(
          { row, sessionIndex, exercise },
          { block, previous, level },
        ),
    });

    return { ...block, type: "deload", weeks: 1, sessions };
  }

  private static forRole(
    type: BlockType,
    role: ExerciseRole,
  ): RowDefaultTargets {
    if (type !== "deload") {
      return RowDefaults.copied(RowDefaults.loadedDefaults(type, role));
    }
    const loaded = RowDefaults.loadedDefaults("hypertrophy", role);
    const { count, reps } = loaded.start;

    return {
      start: {
        count: RowDefaults.halved(count),
        ...RowDefaults.deloadedSet({ reps, rir: DELOAD_RIR }, PLATE_STEP),
      },
      restSeconds: loaded.restSeconds,
    };
  }

  private static loadedDefaults(
    type: LoadingBlockType,
    role: ExerciseRole,
  ): RowDefaultTargets {
    if (type === "foundation") return FOUNDATION;
    if (role === "isolation") return ISOLATION;
    if (role === "secondary-compound") return SECONDARY;

    return type === "strength" ? STRENGTH_MAIN : HYPERTROPHY_MAIN;
  }

  private static copied({
    start,
    restSeconds,
  }: RowDefaultTargets): RowDefaultTargets {
    return { start: { ...start, reps: { ...start.reps } }, restSeconds };
  }

  private static deloadWeight(weightKg: number, step: WeightStep): number {
    const lighter = WeightSteps.reachableLoadDown(
      weightKg * DELOAD_WEIGHT_FACTOR,
      step,
    );

    return lighter < weightKg * (1 - DELOAD_LARGEST_CUT) ? weightKg : lighter;
  }

  private static deloadedSet(
    { reps, weightKg }: SetTargets,
    step: WeightStep,
  ): SetTargets {
    return {
      reps: { ...reps },
      rir: DELOAD_RIR,
      ...(weightKg === undefined
        ? {}
        : { weightKg: RowDefaults.deloadWeight(weightKg, step) }),
    };
  }

  private static halved(count: number): number {
    return Math.max(1, Math.ceil(count / 2));
  }

  private static warmUpsFor(slot: Slot, rir: number): SetTargets[] {
    if (ROLE_BY_SLOT[slot] !== "main-compound") return [];

    return MAIN_COMPOUND_WARM_UP_REPS.map((reps) => ({
      reps: { ...reps },
      rir,
    }));
  }

  /** The targets of each of `count` working sets: every set at the default RIR, the last at `lastSetRir`. */
  private static workingStarts(working: WorkingTargets): SetTargets[] {
    const { count, rir, lastSetRir = rir, reps, weightKg } = working;

    return Array.from({ length: count }, (_, index) => ({
      reps: { ...reps },
      rir: index === count - 1 ? lastSetRir : rir,
      ...(weightKg === undefined ? {} : { weightKg }),
    }));
  }

  private static deloadStartWeek(
    { row, sessionIndex, exercise }: DeloadedRow,
    { block, previous, level }: DeloadStart,
  ): ResolvedWeek {
    const firstWeek = () =>
      ProgramProgression.resolvedWeek(row, 1, { block, level, exercise });
    if (!previous) return firstWeek();
    const previousRow = RowDefaults.previousRowOf(
      previous,
      sessionIndex,
      row.exerciseId,
    );
    if (!previousRow) return firstWeek();

    return ProgramProgression.resolvedWeek(previousRow, previous.weeks, {
      block: previous,
      level,
      exercise,
    });
  }

  private static previousRowOf(
    previous: Block,
    sessionIndex: number,
    exerciseId: string,
  ): ExerciseRow | undefined {
    if (exerciseId === "") return undefined;
    const sameSession = previous.sessions[sessionIndex]?.rows.find(
      (row) => row.exerciseId === exerciseId,
    );

    return (
      sameSession ??
      previous.sessions
        .flatMap((session) => session.rows)
        .find((row) => row.exerciseId === exerciseId)
    );
  }

  private plannedSet(kind: SetKind, start: SetTargets): PlannedSet {
    return {
      id: this.options.newId(),
      kind,
      start: { ...start, reps: { ...start.reps } },
    };
  }

  private plannedSetsOf(
    kind: SetKind,
    starts: readonly SetTargets[],
  ): PlannedSet[] {
    return starts.map((start) => this.plannedSet(kind, start));
  }

  private workingStartsAt(
    sets: readonly PlannedSet[],
    defaults: WorkingTargets,
  ): PlannedSet[] {
    const working = sets.filter((set) => set.kind === "working");
    const weightKg = working[0]?.start.weightKg;
    const starts = RowDefaults.workingStarts({
      ...defaults,
      ...(weightKg === undefined ? {} : { weightKg }),
    });

    return starts.map((start, index) =>
      working[index]
        ? { ...working[index], start }
        : this.plannedSet("working", start),
    );
  }

  /** The warm-up sets as they are, and the first half of the working sets, lighter and further from failure. */
  private deloadedSets(
    sets: readonly SetValues[],
    step: WeightStep,
  ): PlannedSet[] {
    const warmUps = sets.filter((set) => set.kind === "warm-up");
    const working = sets.filter((set) => set.kind === "working");

    return [
      ...this.plannedSetsOf(
        "warm-up",
        warmUps.map((set) => set.start),
      ),
      ...this.plannedSetsOf(
        "working",
        working
          .slice(0, RowDefaults.halved(working.length))
          .map((set) => RowDefaults.deloadedSet(set.start, step)),
      ),
    ];
  }

  /** Every row of the block deloaded from the week `weekOf` resolves for it, in the exercise's weight steps; nothing the coach typed stays. */
  private withDeloadedRows(
    block: Block,
    { libraryExercises, weekOf }: DeloadedRowsSource,
  ): Session[] {
    const exercisesById = new Map(
      libraryExercises.map((exercise) => [exercise.id, exercise]),
    );

    return block.sessions.map((session, sessionIndex) => ({
      ...session,
      rows: session.rows.map((row) => {
        const exercise = exercisesById.get(row.exerciseId);
        const sets = weekOf(row, sessionIndex, exercise).sets.map(
          (set): SetValues => ({
            kind: set.kind,
            start: ProgramProgression.targetsOf(set),
          }),
        );

        return {
          ...row,
          startSets: this.deloadedSets(sets, WeightSteps.stepOf(exercise)),
          touched: [],
        };
      }),
    }));
  }
}
