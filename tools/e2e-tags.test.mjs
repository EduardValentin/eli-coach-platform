import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { auditJourneyTags, auditJourneyTagsInSource } from "./e2e-tags.mjs";

const journeysRoot = resolve(
  import.meta.dirname,
  "..",
  "apps/platform/e2e/journeys",
);

describe("e2e journey tags", () => {
  it("accepts every journey in the repo", () => {
    // arrange
    const directory = journeysRoot;

    // act
    const problems = auditJourneyTags(directory);

    // assert
    expect(problems).toEqual([]);
  });

  it.each([
    ["a critical tag", 'test("a", { tag: "@critical" }, async () => {});'],
    [
      "a completeness tag",
      'test("a", { tag: "@completeness" }, async () => {});',
    ],
    [
      "a tag in a one-element array",
      'test("a", { tag: ["@critical"] }, async () => {});',
    ],
    [
      "a tagged test in a describe",
      'test.describe("g", () => { test("a", { tag: "@critical" }, async () => {}); });',
    ],
    [
      "a tagged template title",
      'test(`a ${role}`, { tag: "@completeness" }, async () => {});',
    ],
    [
      "a use call and a step",
      'test.use({ locale: "en" }); test("a", { tag: "@critical" }, async () => { await test.step("s", async () => {}); });',
    ],
  ])("accepts %s", (_name, text) => {
    // arrange
    const source = text;

    // act
    const problems = auditJourneyTagsInSource("a.spec.ts", source);

    // assert
    expect(problems).toEqual([]);
  });

  it.each([
    [
      "an untagged test",
      'test("a", async () => {});',
      ['a.spec.ts:1: test "a" has no tag'],
    ],
    [
      "an options object without a tag",
      'test("a", { timeout: 1 }, async () => {});',
      ['a.spec.ts:1: test "a" has no tag'],
    ],
    [
      "two tags in an array",
      'test("a", { tag: ["@critical", "@completeness"] }, async () => {});',
      ['a.spec.ts:1: test "a" has 2 tags (@critical, @completeness)'],
    ],
    [
      "the same tag twice",
      'test("a", { tag: ["@critical", "@critical"] }, async () => {});',
      ['a.spec.ts:1: test "a" has 2 tags (@critical, @critical)'],
    ],
    [
      "an unknown tag",
      'test("a", { tag: "@smoke" }, async () => {});',
      [
        'a.spec.ts:1: test "a" has tag @smoke, not one of @critical or @completeness',
      ],
    ],
    [
      "a skipped untagged test",
      'test.skip("a", async () => {});',
      ['a.spec.ts:1: test "a" has no tag'],
    ],
    [
      "an only untagged test",
      'test.only("a", async () => {});',
      ['a.spec.ts:1: test "a" has no tag'],
    ],
    [
      "an untagged test inside a describe",
      'test.describe("g", () => {\n  test("a", async () => {});\n});',
      ['a.spec.ts:2: test "a" has no tag'],
    ],
    [
      "a describe-level tag",
      'test.describe("g", { tag: "@critical" }, () => { test("a", { tag: "@critical" }, async () => {}); });',
      ["a.spec.ts:1: test.describe carries a tag; tag each test instead"],
    ],
    [
      "an untagged template title",
      "test(`a ${role}`, async () => {});",
      ["a.spec.ts:1: test `a ${role}` has no tag"],
    ],
  ])("rejects %s", (_name, text, expected) => {
    // arrange
    const source = text;

    // act
    const problems = auditJourneyTagsInSource("a.spec.ts", source);

    // assert
    expect(problems).toEqual(expected);
  });
});
