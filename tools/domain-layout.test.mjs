import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  auditDomainLayout,
  auditSharedLayout,
  auditUnitNames,
} from "./domain-layout.mjs";

const boundedContextsRoot = resolve(
  import.meta.dirname,
  "..",
  "apps/platform/src/bounded-contexts",
);
const fixturesRoot = resolve(import.meta.dirname, "domain-layout-fixtures");
const sharedRoot = resolve(
  import.meta.dirname,
  "..",
  "apps/platform/src/shared",
);
const fixtureDomain = "sample/widgets/domain";

describe("domain layout", () => {
  it("accepts every component's domain", () => {
    // arrange
    const root = boundedContextsRoot;

    // act
    const problems = auditDomainLayout(root);

    // assert
    expect(problems).toEqual([]);
  });

  it.each([
    ["valid", []],
    ["singular-entity", []],
    ["missing-entity", [`${fixtureDomain}/thing: missing thing.ts`]],
    ["missing-index", [`${fixtureDomain}/thing: missing index.ts`]],
    [
      "service-name",
      [
        `${fixtureDomain}/thing/thing-service.ts: service file name`,
        `${fixtureDomain}/thing/thing-service.ts: exports a *Service`,
      ],
    ],
    [
      "two-use-cases",
      [
        `${fixtureDomain}/thing/do-thing-use-case.ts: expected one *UseCase class, found 2`,
      ],
    ],
    [
      "no-execute",
      [`${fixtureDomain}/thing/do-thing-use-case.ts: no execute method`],
    ],
  ])("fixture %s reports %j", (fixture, expected) => {
    // arrange
    const root = join(fixturesRoot, fixture);

    // act
    const problems = auditDomainLayout(root);

    // assert
    expect(problems).toEqual(expected);
  });
});

describe("shared layout", () => {
  it("accepts every shared concern", () => {
    // arrange
    const root = sharedRoot;

    // act
    const problems = auditSharedLayout(root);

    // assert
    expect(problems).toEqual([]);
  });

  it("reports a domain/ or adapters/ folder under shared/", () => {
    // arrange
    const root = join(fixturesRoot, "shared-layout");

    // act
    const problems = auditSharedLayout(root);

    // assert
    expect(problems).toEqual([
      "clock/domain: shared holds no domain/ folder",
      "email/adapters: shared holds no adapters/ folder",
    ]);
  });
});

describe("unit names", () => {
  it("accepts every unit file of the app", () => {
    // arrange
    const root = resolve(import.meta.dirname, "..", "apps/platform/src");

    // act
    const problems = auditUnitNames(root);

    // assert
    expect(problems).toEqual([]);
  });

  it("accepts one unit per file named after it", () => {
    // arrange
    const root = join(fixturesRoot, "unit-names-valid");

    // act
    const problems = auditUnitNames(root);

    // assert
    expect(problems).toEqual([]);
  });

  it("reports files whose unit is missing, doubled or misnamed, and units in a file named otherwise", () => {
    // arrange
    const root = join(fixturesRoot, "unit-names-invalid");

    // act
    const problems = auditUnitNames(root);

    // assert
    expect(problems.sort()).toEqual(
      [
        "clock-port.ts: expected one exported *Port, found 2",
        "clock-port.ts: CalendarPort belongs in calendar-port.ts",
        "create-clock-adapter.server.ts: expected one exported *Adapter, found 0",
        "stray.ts: StrayFacade belongs in stray-facade.ts",
        "system-clock-adapter.server.ts: exports WallClockAdapter, which names another file",
        "system-clock-adapter.server.ts: WallClockAdapter belongs in wall-clock-adapter.ts",
      ].sort(),
    );
  });
});
