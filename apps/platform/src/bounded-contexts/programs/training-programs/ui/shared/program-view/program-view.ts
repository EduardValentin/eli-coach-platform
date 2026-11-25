import type {
  LibraryExercise,
  SetSpec,
  SetTargets,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

export type Range = SetTargets["reps"];

type WorkingSet = Extract<SetSpec, { kind: "working" }>;

type SetsBreakdown = {
  warmUp: number;
  working: number;
  reps: string | null;
  rir: Range | null;
};

const SECONDS_PER_MINUTE = 60;

export function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function nonEmptyLines(text: string): string[] {
  return text.split("\n").filter((line) => line.trim() !== "");
}

export function exerciseNameOf(exercise: LibraryExercise | undefined): string {
  return exercise?.name ?? "Exercise removed";
}

export function musclesAndEquipmentText(
  exercise: LibraryExercise | undefined,
): string {
  if (!exercise) return "";

  return [exercise.primaryMuscles.join(", "), exercise.equipment.join(", ")]
    .filter(Boolean)
    .join(" · ");
}

export function perSideUnit(
  exercise: LibraryExercise | undefined,
  unit: string,
): string {
  return [unit, exercise?.perSide ? "per side" : ""].filter(Boolean).join(" ");
}

/** How the reps unit reads: `implied` after a number where reps go without saying, `spelled` after a number, `column` as a column name. */
type RepsWording = "implied" | "spelled" | "column";

const REPS_WORDS: Record<RepsWording, { reps: string; time: string }> = {
  implied: { reps: "", time: "s" },
  spelled: { reps: "reps", time: "s" },
  column: { reps: "Reps", time: "Seconds" },
};

export function repsUnit(
  exercise: LibraryExercise | undefined,
  wording: RepsWording = "implied",
): string {
  const words = REPS_WORDS[wording];

  return perSideUnit(
    exercise,
    exercise?.unit === "time" ? words.time : words.reps,
  );
}

export function repsSuffix(exercise: LibraryExercise | undefined): string {
  const unit = repsUnit(exercise);

  return unit && ` ${unit}`;
}

export function formatRange({ min, max }: Range): string {
  return min === max ? String(min) : `${min}–${max}`;
}

/** The lowest to the highest RIR of several sets, one number when they agree. */
export function rirSpan(rirs: readonly number[]): Range {
  return { min: Math.min(...rirs), max: Math.max(...rirs) };
}

export function formatRest(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) return `${seconds} s`;
  const rest = seconds % SECONDS_PER_MINUTE;

  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(rest).padStart(2, "0")}`;
}

function isWorkingSet(set: SetSpec): set is WorkingSet {
  return set.kind === "working";
}

/** What makes two working sets different kinds of set; RIR steps down across a week's sets by design. */
function isSameKindOfSet(left: WorkingSet, right: WorkingSet): boolean {
  return (
    left.reps.min === right.reps.min &&
    left.reps.max === right.reps.max &&
    left.weightKg === right.weightKg
  );
}

/** `reps` only when every working set is the same kind of set, so the reps speak for all of them. */
export function setsBreakdown(
  sets: readonly SetSpec[],
  suffix = "",
): SetsBreakdown {
  const working = sets.filter(isWorkingSet);
  const [first] = working;
  const uniform =
    first !== undefined && working.every((set) => isSameKindOfSet(first, set));

  return {
    warmUp: sets.length - working.length,
    working: working.length,
    reps: uniform ? `${formatRange(first.reps)}${suffix}` : null,
    rir: first === undefined ? null : rirSpan(working.map((set) => set.rir)),
  };
}
