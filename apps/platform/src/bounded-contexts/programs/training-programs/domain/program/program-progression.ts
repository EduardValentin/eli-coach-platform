import type { LibraryExercise } from "./library-exercise";
import type {
  Block,
  ExerciseRow,
  PlannedSet,
  Range,
  Session,
  SetTargets,
} from "./program-content";
import type { ClientLevel, SetKind } from "./vocabulary";
import { WeightSteps, type WeightStep } from "./weight-steps";

const WEEKLY_CAPACITY_GAIN: Record<ClientLevel, number> = {
  beginner: 0.025,
  intermediate: 0.01,
  advanced: 0.005,
};
const HYPERTROPHY_RIR_FLOOR = 1;
const STRENGTH_RIR_FLOOR = 2;
const FEWEST_WEEKS_FOR_RIR_TAPER = 3;
const TIMED_STEP_SECONDS = 5;
const ADVANCED_TIMED_STEP_EVERY_WEEKS = 2;
const EPLEY_REPS_PER_UNIT = 30;
const CALIBRATION_WEEK = 1;
const FIRST_WEEK = 1;

export type ProgressionNote =
  "step-too-large" | "progress-the-variation" | "harder-variation-or-add-load";

/** One set of one week, as the progression suggests it. */
export type ResolvedSet = SetTargets & {
  setId: string;
  kind: SetKind;
  note?: ProgressionNote;
};

export type ResolvedWeek = { week: number; sets: ResolvedSet[] };

export type ProgressionContext = {
  block: Pick<Block, "type" | "weeks" | "calibrationWeek">;
  level: ClientLevel;
  exercise?: LibraryExercise;
};

type WarmUpSet = { kind: "warm-up"; reps: Range; weightKg?: number };
type WorkingSet = {
  kind: "working";
  reps: Range;
  rir: number;
  weightKg?: number;
};

/** One set as the client reads it in a week. */
export type SetSpec = WarmUpSet | WorkingSet;

/** A row as it reads in one week of its block, with that week's sets in order. */
export type WeekRow = Omit<ExerciseRow, "startSets"> & { sets: SetSpec[] };

export type WeekSession = Omit<Session, "rows"> & { rows: WeekRow[] };

export type WeekContext = {
  block: Block;
  level: ClientLevel;
  exercisesById: ReadonlyMap<string, LibraryExercise>;
};

type ProgressionMode = "held" | "load" | "timed" | "bodyweight";

type ProgressionRules = {
  mode: ProgressionMode;
  level: ClientLevel;
  gain: number;
  rirFloor: number;
  flatRir: boolean;
  step: WeightStep;
  weeks: number;
  calibrationWeek: boolean;
};

type WeekState = { weightKg: number | undefined; reps: number; rir: number };
type CapacityAnchor = WeekState & {
  index: number;
  capacity: number | undefined;
};
type RirAnchor = { index: number; rir: number };
type SuggestedWeek = WeekState & { note?: ProgressionNote; shownReps?: Range };
type Progress = {
  previous: SuggestedWeek;
  capacity: CapacityAnchor;
  taper: RirAnchor;
};
type WeekInput = {
  range: Range;
  progress: Progress;
  index: number;
  rir: number;
};
type SetChain = { range: Range; weeks: SuggestedWeek[] };
type ChainCursor = {
  week: number;
  range: Range;
  opening: SuggestedWeek;
  progress: Progress | undefined;
};
type ChainStep = { suggested: SuggestedWeek; progress: Progress | undefined };
type ChainedSet = { set: PlannedSet; blockWeeks: number };
type ChainedGroup = { group: readonly PlannedSet[]; blockWeeks: number };
type RowProgression = {
  rules: ProgressionRules;
  firstWeek: PlannedSet[];
  chains: ReadonlyMap<string, SetChain>;
  referenceWeek: number;
};
type Suggestion = { targets: SetTargets; note?: ProgressionNote };
type SetInWeek = { set: PlannedSet; week: number };

/**
 * The read side of a row's weeks: each later week suggested from the first
 * week, the client's level and the block type (Business Rule 34).
 */
export class ProgramProgression {
  static resolvedWeek(
    row: ExerciseRow,
    week: number,
    context: ProgressionContext,
  ): ResolvedWeek {
    const weeks = Math.max(1, context.block.weeks);

    return ProgramProgression.resolvedWeekOf(
      ProgramProgression.rowProgressionOf(row, context),
      Math.min(Math.max(week, 1), weeks),
    );
  }

  static targetsOf({ reps, rir, weightKg }: ResolvedSet): SetTargets {
    return ProgramProgression.cloned({ reps, rir, weightKg });
  }

  static sessionAtWeek(
    session: Session,
    week: number,
    { block, level, exercisesById }: WeekContext,
  ): WeekSession {
    const rows = session.rows.map((row) =>
      ProgramProgression.rowAtWeek(row, week, {
        block,
        level,
        exercise: exercisesById.get(row.exerciseId),
      }),
    );

    return { ...session, rows };
  }

  private static rowAtWeek(
    row: ExerciseRow,
    week: number,
    context: ProgressionContext,
  ): WeekRow {
    const { startSets: _start, ...rest } = row;
    const { sets } = ProgramProgression.resolvedWeek(row, week, context);

    return { ...rest, sets: sets.map(ProgramProgression.setSpecOf) };
  }

  private static setSpecOf({
    kind,
    reps,
    rir,
    weightKg,
  }: ResolvedSet): SetSpec {
    const weight = ProgramProgression.weightOf(weightKg);
    if (kind === "warm-up") return { kind, reps: { ...reps }, ...weight };

    return { kind, reps: { ...reps }, rir, ...weight };
  }

  private static cloned({ reps, rir, weightKg }: SetTargets): SetTargets {
    return { reps: { ...reps }, rir, ...ProgramProgression.weightOf(weightKg) };
  }

  private static weightOf(
    weightKg: number | undefined,
  ): Pick<SetTargets, "weightKg"> {
    return weightKg === undefined ? {} : { weightKg };
  }

  private static isCalibrationWeek(
    block: Pick<Block, "calibrationWeek">,
    week: number,
  ): boolean {
    return block.calibrationWeek && week === CALIBRATION_WEEK;
  }

  /** The week whose weight the block's progression starts from: the one after the calibration week when there is one. */
  private static firstLoadingWeek(
    block: Pick<Block, "calibrationWeek">,
  ): number {
    return block.calibrationWeek ? CALIBRATION_WEEK + 1 : FIRST_WEEK;
  }

  private static modeOf(
    row: ExerciseRow,
    { exercise, block }: ProgressionContext,
  ): ProgressionMode {
    if (row.progression.kind === "custom" || block.type === "deload") {
      return "held";
    }
    const unit = exercise?.unit ?? "reps";
    if (unit === "time") return "timed";
    if (unit !== "reps") return "held";

    return exercise && !WeightSteps.takesLoad(exercise.equipment)
      ? "bodyweight"
      : "load";
  }

  private static rulesOf(
    row: ExerciseRow,
    context: ProgressionContext,
  ): ProgressionRules {
    const { block, level, exercise } = context;
    const weeks = block.calibrationWeek
      ? Math.max(1, block.weeks - 1)
      : block.weeks;
    const mode = ProgramProgression.modeOf(row, context);

    return {
      mode,
      level,
      gain: WEEKLY_CAPACITY_GAIN[level],
      rirFloor:
        block.type === "strength" ? STRENGTH_RIR_FLOOR : HYPERTROPHY_RIR_FLOOR,
      flatRir:
        mode === "timed" ||
        level === "beginner" ||
        block.type === "foundation" ||
        weeks < FEWEST_WEEKS_FOR_RIR_TAPER,
      step: WeightSteps.stepOf(exercise),
      weeks,
      calibrationWeek: block.calibrationWeek,
    };
  }

  private static progressionIndexOf(
    rules: ProgressionRules,
    week: number,
  ): number {
    return rules.calibrationWeek ? week - 1 : week;
  }

  private static epleyCapacity({
    weightKg,
    reps,
    rir,
  }: WeekState): number | undefined {
    if (weightKg === undefined || weightKg <= 0) return undefined;

    return weightKg * (1 + (reps + rir) / EPLEY_REPS_PER_UNIT);
  }

  private static anchorAt(index: number, state: WeekState): CapacityAnchor {
    return {
      weightKg: state.weightKg,
      reps: state.reps,
      rir: state.rir,
      index,
      capacity: ProgramProgression.epleyCapacity(state),
    };
  }

  private static taperedRir(
    rules: ProgressionRules,
    taper: RirAnchor,
    index: number,
  ): number {
    const { rir } = taper;
    if (rules.flatRir || rir <= rules.rirFloor || taper.index >= rules.weeks) {
      return rir;
    }

    return (
      rir -
      Math.floor(
        ((index - taper.index) * (rir - rules.rirFloor)) /
          (rules.weeks - taper.index),
      )
    );
  }

  private static capacityAt(
    rules: ProgressionRules,
    anchor: CapacityAnchor,
    index: number,
  ): number | undefined {
    if (anchor.capacity === undefined) return undefined;

    return anchor.capacity * (1 + rules.gain * (index - anchor.index));
  }

  private static repsAtLoad(
    capacity: number,
    weightKg: number,
    rir: number,
  ): number {
    return Math.round(EPLEY_REPS_PER_UNIT * (capacity / weightKg - 1)) - rir;
  }

  private static repsWithoutLoad(
    rules: ProgressionRules,
    {
      anchor,
      index,
      rir,
    }: { anchor: CapacityAnchor; index: number; rir: number },
  ): number {
    const growth = Math.round(
      rules.gain *
        (index - anchor.index) *
        (EPLEY_REPS_PER_UNIT + anchor.reps + anchor.rir),
    );

    return anchor.reps + growth + (anchor.rir - rir);
  }

  private static clamp(value: number, { min, max }: Range): number {
    return Math.min(max, Math.max(min, value));
  }

  private static steppedLoad(
    rules: ProgressionRules,
    input: WeekInput,
    capacity: number,
  ): SuggestedWeek {
    const { range, progress, rir } = input;
    const weightKg = progress.previous.weightKg as number;
    const reps = ProgramProgression.repsAtLoad(capacity, weightKg, rir);
    if (reps <= range.max) {
      return {
        weightKg,
        rir,
        reps: ProgramProgression.clamp(
          Math.max(reps, progress.previous.reps),
          range,
        ),
      };
    }
    let heavier = WeightSteps.nextLoadUp(weightKg, rules.step);
    while (ProgramProgression.repsAtLoad(capacity, heavier, rir) > range.max) {
      heavier = WeightSteps.nextLoadUp(heavier, rules.step);
    }
    const repsAtHeavier = ProgramProgression.repsAtLoad(capacity, heavier, rir);
    if (repsAtHeavier >= range.min) {
      return { weightKg: heavier, rir, reps: repsAtHeavier };
    }

    return { weightKg, rir, reps: range.max, note: "step-too-large" };
  }

  private static cappedReps(
    range: Range,
    reps: number,
    note: ProgressionNote | undefined,
  ): Pick<SuggestedWeek, "reps" | "note"> {
    if (reps <= range.max) {
      return { reps: ProgramProgression.clamp(reps, range) };
    }

    return { reps: range.max, ...(note ? { note } : {}) };
  }

  private static timedSeconds(
    rules: ProgressionRules,
    input: WeekInput,
  ): number {
    const weeksSince = input.index - input.progress.capacity.index;
    const steps =
      rules.level === "advanced"
        ? Math.floor(weeksSince / ADVANCED_TIMED_STEP_EVERY_WEEKS)
        : weeksSince;

    return input.progress.capacity.reps + steps * TIMED_STEP_SECONDS;
  }

  private static suggestedWeek(
    rules: ProgressionRules,
    input: WeekInput,
  ): SuggestedWeek {
    const { range, progress, index, rir } = input;
    const { previous, capacity: anchor } = progress;
    const held = { weightKg: previous.weightKg, rir };
    if (rules.mode === "timed") {
      return {
        ...held,
        ...ProgramProgression.cappedReps(
          range,
          ProgramProgression.timedSeconds(rules, input),
          "progress-the-variation",
        ),
      };
    }
    const unloadedReps = Math.max(
      ProgramProgression.repsWithoutLoad(rules, { anchor, index, rir }),
      previous.reps,
    );
    if (rules.mode === "bodyweight") {
      return {
        ...held,
        ...ProgramProgression.cappedReps(
          range,
          unloadedReps,
          "harder-variation-or-add-load",
        ),
      };
    }
    const capacity = ProgramProgression.capacityAt(rules, anchor, index);
    if (capacity === undefined || previous.weightKg === undefined) {
      return {
        ...held,
        ...ProgramProgression.cappedReps(range, unloadedReps, undefined),
      };
    }

    return ProgramProgression.steppedLoad(rules, input, capacity);
  }

  /** Warm-up sets before working sets. */
  private static firstWeekPlannedSets(row: ExerciseRow): PlannedSet[] {
    const ofKind = (kind: SetKind) =>
      row.startSets.filter((set) => set.kind === kind);

    return [...ofKind("warm-up"), ...ofKind("working")];
  }

  /** One week of a chain: the calibration week without weight, the first loading week as the chain opens, then each week suggested from the one before. */
  private static nextChainWeek(
    rules: ProgressionRules,
    { week, range, opening, progress }: ChainCursor,
  ): ChainStep {
    const index = ProgramProgression.progressionIndexOf(rules, week);
    if (ProgramProgression.isCalibrationWeek(rules, week)) {
      return { suggested: { ...opening, weightKg: undefined }, progress };
    }
    if (!progress) {
      return {
        suggested: opening,
        progress: {
          previous: opening,
          capacity: ProgramProgression.anchorAt(index, opening),
          taper: { index, rir: opening.rir },
        },
      };
    }
    if (rules.mode === "held") {
      return { suggested: { ...progress.previous }, progress };
    }
    const suggested = ProgramProgression.suggestedWeek(rules, {
      range,
      progress,
      index,
      rir: ProgramProgression.taperedRir(rules, progress.taper, index),
    });

    return { suggested, progress: { ...progress, previous: suggested } };
  }

  /** A working set of the first week, suggested week by week from what it starts from. */
  private static chainOf(
    rules: ProgressionRules,
    { set, blockWeeks }: ChainedSet,
  ): SetChain {
    const range = set.start.reps;
    const opening: SuggestedWeek = {
      reps: range.min,
      rir: set.start.rir,
      weightKg: set.start.weightKg,
      shownReps: range,
    };
    const weeks: SuggestedWeek[] = [];
    let progress: Progress | undefined;
    for (let week = FIRST_WEEK; week <= blockWeeks; week += 1) {
      const step = ProgramProgression.nextChainWeek(rules, {
        week,
        range,
        opening,
        progress,
      });
      weeks.push(step.suggested);
      progress = step.progress;
    }

    return { range, weeks };
  }

  /** A working set's RIR week by week: its own first-week RIR, tapered from the first loading week as its chain would. */
  private static rirWeeks(
    rules: ProgressionRules,
    rir: number,
    blockWeeks: number,
  ): number[] {
    const weeks = Array.from(
      { length: blockWeeks },
      (_, offset) => FIRST_WEEK + offset,
    );
    const anchorWeek = Math.min(
      ProgramProgression.firstLoadingWeek(rules),
      blockWeeks,
    );
    const taper = {
      index: ProgramProgression.progressionIndexOf(rules, anchorWeek),
      rir,
    };

    return weeks.map((week) =>
      week <= anchorWeek || rules.mode === "held"
        ? rir
        : ProgramProgression.taperedRir(
            rules,
            taper,
            ProgramProgression.progressionIndexOf(rules, week),
          ),
    );
  }

  /** What makes two working sets different kinds of set; RIR steps down across a week's sets by design. */
  private static isSameKindOfSet(left: SetTargets, right: SetTargets): boolean {
    return (
      left.reps.min === right.reps.min &&
      left.reps.max === right.reps.max &&
      left.weightKg === right.weightKg
    );
  }

  /** The first week's working sets of one kind, the first of them leading the group's reps and weight. */
  private static setGroupsOf(working: readonly PlannedSet[]): PlannedSet[][] {
    return working.reduce<PlannedSet[][]>((groups, set) => {
      const group = groups.find(([leader]) =>
        ProgramProgression.isSameKindOfSet(leader.start, set.start),
      );
      if (!group) return [...groups, [set]];
      group.push(set);

      return groups;
    }, []);
  }

  /** Sets of one kind share their leader's reps and weight every week, so only RIR tells them apart; each set's RIR tapers on its own. */
  private static groupChains(
    rules: ProgressionRules,
    { group, blockWeeks }: ChainedGroup,
  ): [string, SetChain][] {
    const [leader, ...followers] = group;
    const chain = ProgramProgression.chainOf(rules, {
      set: leader,
      blockWeeks,
    });

    return [
      [leader.id, chain],
      ...followers.map((set): [string, SetChain] => {
        const rirs = ProgramProgression.rirWeeks(
          rules,
          set.start.rir,
          blockWeeks,
        );

        return [
          set.id,
          {
            range: chain.range,
            weeks: chain.weeks.map((state, index) => ({
              ...state,
              rir: rirs[index],
            })),
          },
        ];
      }),
    ];
  }

  private static rowProgressionOf(
    row: ExerciseRow,
    context: ProgressionContext,
  ): RowProgression {
    const rules = ProgramProgression.rulesOf(row, context);
    const blockWeeks = Math.max(1, context.block.weeks);
    const firstWeek = ProgramProgression.firstWeekPlannedSets(row);
    const groups = ProgramProgression.setGroupsOf(
      firstWeek.filter((set) => set.kind === "working"),
    );
    const chains = new Map(
      groups.flatMap((group) =>
        ProgramProgression.groupChains(rules, { group, blockWeeks }),
      ),
    );

    return {
      rules,
      firstWeek,
      chains,
      referenceWeek: Math.min(
        ProgramProgression.firstLoadingWeek(rules),
        blockWeeks,
      ),
    };
  }

  private static chainSuggestion(
    { range, weeks }: SetChain,
    week: number,
  ): Suggestion {
    const state = weeks[week - 1];
    const reps = state.shownReps ?? {
      min: state.reps,
      max: Math.max(state.reps, range.max),
    };

    return {
      targets: {
        reps: { ...reps },
        rir: state.rir,
        ...ProgramProgression.weightOf(state.weightKg),
      },
      ...(state.note ? { note: state.note } : {}),
    };
  }

  /** What a working set reads in a week: its chain. */
  private static directSuggestion(
    progression: RowProgression,
    { set, week }: SetInWeek,
  ): Suggestion {
    const chain = progression.chains.get(set.id);
    if (chain) return ProgramProgression.chainSuggestion(chain, week);

    return { targets: ProgramProgression.cloned(set.start) };
  }

  /** The heaviest working weight of a week. */
  private static heaviestLoad(
    progression: RowProgression,
    week: number,
  ): number | undefined {
    if (ProgramProgression.isCalibrationWeek(progression.rules, week)) {
      return undefined;
    }
    const loads = progression.firstWeek
      .filter((set) => progression.chains.has(set.id))
      .flatMap((set) => {
        const { weightKg } = ProgramProgression.directSuggestion(progression, {
          set,
          week,
        }).targets;

        return weightKg === undefined ? [] : [weightKg];
      });

    return loads.length === 0 ? undefined : Math.max(...loads);
  }

  /** A warm-up set's weight follows the week's heaviest working set, rounded to the step. */
  private static warmUpSuggestion(
    progression: RowProgression,
    { set, week }: SetInWeek,
  ): Suggestion {
    const first = ProgramProgression.cloned(set.start);
    if (ProgramProgression.isCalibrationWeek(progression.rules, week)) {
      return { targets: { reps: first.reps, rir: first.rir } };
    }
    const load = ProgramProgression.heaviestLoad(progression, week);
    const reference = ProgramProgression.heaviestLoad(
      progression,
      progression.referenceWeek,
    );
    if (
      first.weightKg === undefined ||
      load === undefined ||
      reference === undefined ||
      reference <= 0 ||
      load === reference
    ) {
      return { targets: first };
    }

    return {
      targets: {
        ...first,
        weightKg: WeightSteps.nearestLoad(
          (first.weightKg * load) / reference,
          progression.rules.step,
        ),
      },
    };
  }

  private static resolvedSetOf(
    progression: RowProgression,
    inWeek: SetInWeek,
  ): ResolvedSet {
    const { set } = inWeek;
    const { targets, note } = progression.chains.has(set.id)
      ? ProgramProgression.directSuggestion(progression, inWeek)
      : ProgramProgression.warmUpSuggestion(progression, inWeek);

    return {
      setId: set.id,
      kind: set.kind,
      ...targets,
      ...(note ? { note } : {}),
    };
  }

  private static resolvedWeekOf(
    progression: RowProgression,
    week: number,
  ): ResolvedWeek {
    const sets = progression.firstWeek.map((set) =>
      ProgramProgression.resolvedSetOf(progression, { set, week }),
    );

    return { week, sets };
  }
}
