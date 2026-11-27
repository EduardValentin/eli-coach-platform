import type { ReactNode } from "react";

import type { WeekRow } from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { counted, formatRest, setsBreakdown } from "./program-view";
import { RirValue } from "./rir-value";

export type Target = { term: string; value: ReactNode };

const NO_SETS: Target = { term: "Sets", value: "None yet" };

/** "4 sets × 6–10 s", breaking only around the ×, so a unit never ends up alone on a line. */
function workingValue(count: number, reps: string): ReactNode {
  return (
    <span>
      <span className="whitespace-nowrap">{counted(count, "set")}</span> ×{" "}
      <span className="whitespace-nowrap">{reps}</span>
    </span>
  );
}

function workingTarget(working: number, reps: string | null): Target {
  return {
    term: "Working",
    value: reps
      ? workingValue(working, reps)
      : `${counted(working, "set")}, varied`,
  };
}

export function rowTargets(row: WeekRow, repsSuffix: string): Target[] {
  const { warmUp, working, reps, rir } = setsBreakdown(row.sets, repsSuffix);
  if (warmUp + working === 0) return [NO_SETS];

  return [
    ...(warmUp > 0 ? [{ term: "Warm-up", value: counted(warmUp, "set") }] : []),
    ...(working > 0 ? [workingTarget(working, reps)] : []),
    ...(rir ? [{ term: "RIR", value: <RirValue rir={rir} /> }] : []),
    { term: "Rest", value: formatRest(row.restSeconds) },
  ];
}
