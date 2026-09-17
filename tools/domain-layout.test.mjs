import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { auditDomainLayout } from "./domain-layout.mjs";

const domainRoot = resolve(import.meta.dirname, "..", "packages/domain/src");
const fixturesRoot = resolve(import.meta.dirname, "domain-layout-fixtures");

describe("domain layout", () => {
  it("accepts the real domain package", () => {
    // arrange
    const root = domainRoot;

    // act
    const problems = auditDomainLayout(root);

    // assert
    expect(problems).toEqual([]);
  });

  it.each([
    ["valid", []],
    ["missing-entity", ["thing: missing thing.ts"]],
    ["missing-index", ["thing: missing index.ts"]],
    [
      "service-name",
      [
        "thing/thing-service.ts: service file name",
        "thing/thing-service.ts: exports a *Service",
      ],
    ],
    [
      "two-use-cases",
      ["thing/do-thing-use-case.ts: expected one *UseCase class, found 2"],
    ],
    ["no-execute", ["thing/do-thing-use-case.ts: no execute method"]],
  ])("fixture %s reports %j", (fixture, expected) => {
    // arrange
    const root = join(fixturesRoot, fixture);

    // act
    const problems = auditDomainLayout(root);

    // assert
    expect(problems).toEqual(expected);
  });
});
