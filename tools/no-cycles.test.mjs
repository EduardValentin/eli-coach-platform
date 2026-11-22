import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { auditNoCycles } from "./no-cycles.mjs";

const fixturesRoot = resolve(import.meta.dirname, "no-cycles-fixtures");

describe("no cycles between bounded contexts or components", () => {
  it.each([
    [
      "reports two bounded contexts that import each other",
      "context-cycle",
      ["bounded context cycle: alpha -> beta -> alpha"],
    ],
    ["accepts bounded contexts that depend one way", "context-one-way", []],
    [
      "reports two components of one bounded context that import each other",
      "component-cycle",
      ["component cycle: alpha/gadgets -> alpha/widgets -> alpha/gadgets"],
    ],
    [
      "accepts components that depend one way, and a component that reads its own bounded context's public folder",
      "component-one-way",
      [],
    ],
  ])("%s", (_defect, fixture, expected) => {
    // arrange
    const root = resolve(fixturesRoot, fixture);

    // act
    const problems = auditNoCycles(root);

    // assert
    expect(problems).toEqual(expected);
  });
});
