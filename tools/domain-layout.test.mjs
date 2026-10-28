import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { auditDomainLayout, auditSharedLayout } from "./domain-layout.mjs";

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
