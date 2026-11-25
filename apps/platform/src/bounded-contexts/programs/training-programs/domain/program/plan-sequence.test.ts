import { describe, expect, it } from "vitest";

import { PlanSequence } from "./plan-sequence";
import type { Block } from "./program-content";
import type { BlockType } from "./vocabulary";

type Spec = { type?: BlockType; weeks?: number };

function blocks(...specs: Spec[]): Block[] {
  return specs.map(
    (spec, index) =>
      ({
        id: `b${index + 1}`,
        originId: `o${index + 1}`,
        type: spec.type ?? "hypertrophy",
        weeks: spec.weeks ?? 4,
      }) as Block,
  );
}

function codes(problems: { code: string }[]): string[] {
  return problems.map((problem) => problem.code);
}

describe("PlanSequence problemsOf", () => {
  it("requires Foundation to come first", () => {
    // act
    const found = PlanSequence.problemsOf(
      blocks({ type: "hypertrophy" }, { type: "foundation" }),
    );

    // assert
    expect(found).toEqual([{ code: "foundation-not-first", blockId: "b2" }]);
  });

  it("refuses a plan that starts with a Deload", () => {
    // act
    const found = PlanSequence.problemsOf(blocks({ type: "deload", weeks: 1 }));

    // assert
    expect(found).toEqual([{ code: "starts-with-deload", blockId: "b1" }]);
  });

  it("refuses consecutive Deloads", () => {
    // act
    const found = PlanSequence.problemsOf(
      blocks(
        { type: "foundation" },
        { type: "deload", weeks: 1 },
        { type: "deload", weeks: 1 },
      ),
    );

    // assert
    expect(found).toEqual([{ code: "consecutive-deloads", blockId: "b3" }]);
  });

  it("accepts a well-formed sequence", () => {
    // act
    const found = PlanSequence.problemsOf(
      blocks({ type: "foundation" }, { type: "deload", weeks: 1 }),
    );

    // assert
    expect(found).toEqual([]);
  });

  it("reports only the order rules of the plan", () => {
    // arrange
    const planBlocks = blocks(
      { type: "deload", weeks: 1 },
      { type: "foundation" },
      { type: "deload", weeks: 1 },
      { type: "deload", weeks: 1 },
    );

    // act
    const found = PlanSequence.problemsOf(planBlocks);

    // assert
    expect(codes(found)).toEqual([
      "starts-with-deload",
      "foundation-not-first",
      "consecutive-deloads",
    ]);
  });

  it("words each problem for the coach", () => {
    // act
    const messages = PlanSequence.problemsOf(
      blocks(
        { type: "deload", weeks: 1 },
        { type: "deload", weeks: 1 },
        {
          type: "foundation",
        },
      ),
    ).map((problem) => PlanSequence.messageOf(problem));

    // assert
    expect(messages).toEqual([
      "The plan cannot start with a Deload",
      "Two Deloads cannot follow each other",
      "Foundation must be the first block",
    ]);
  });
});
