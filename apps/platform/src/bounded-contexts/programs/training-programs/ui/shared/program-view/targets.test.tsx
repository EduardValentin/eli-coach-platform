// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  SetSpec,
  WeekRow,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { rowTargets } from "./targets";
import { TargetsSummary } from "./targets-summary";

afterEach(cleanup);

function rowOf(sets: SetSpec[], restSeconds = 90): WeekRow {
  return {
    id: "row-1",
    exerciseId: "squat",
    slot: "A",
    restSeconds,
    lastSetTechnique: "none",
    substitutions: [],
    progression: { kind: "double" },
    cues: "",
    touched: [],
    sets,
  };
}

function working(reps: [number, number], rir: number): SetSpec {
  return { kind: "working", reps: { min: reps[0], max: reps[1] }, rir };
}

function readTargets(row: WeekRow, repsSuffix = ""): Record<string, string> {
  const { container } = render(
    <TargetsSummary items={rowTargets(row, repsSuffix)} size="sm" />,
  );
  const terms = [...container.querySelectorAll("dt")].map(
    (term) => term.textContent ?? "",
  );
  const values = [...container.querySelectorAll("dd")].map(
    (value) => value.textContent ?? "",
  );

  return Object.fromEntries(terms.map((term, index) => [term, values[index]]));
}

describe("rowTargets", () => {
  it("reads warm-up sets, working sets, RIR and rest", () => {
    // arrange
    const warmUp: SetSpec = { kind: "warm-up", reps: { min: 8, max: 8 } };
    const row = rowOf([
      warmUp,
      working([6, 10], 2),
      working([6, 10], 2),
      working([6, 10], 1),
    ]);

    // act
    const targets = readTargets(row, " s");

    // assert
    expect(targets).toEqual({
      "Warm-up": "1 set",
      Working: "3 sets × 6–10 s",
      RIR: "1–2",
      Rest: "1:30",
    });
  });

  it("says a row without sets has none yet", () => {
    // arrange
    const row = rowOf([]);

    // act
    const targets = readTargets(row);

    // assert
    expect(targets).toEqual({ Sets: "None yet" });
  });

  it("calls working sets of different kinds varied", () => {
    // arrange
    const row = rowOf([working([5, 5], 2), working([8, 10], 2)]);

    // act
    const targets = readTargets(row);

    // assert
    expect(targets).toEqual({
      Working: "2 sets, varied",
      RIR: "2",
      Rest: "1:30",
    });
  });
});
