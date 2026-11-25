import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  auditFragileE2ePatterns,
  auditFragileE2ePatternsInSource,
} from "./e2e-fragile-patterns.mjs";

const e2eRoot = resolve(import.meta.dirname, "..", "apps/platform/e2e");

describe("fragile e2e patterns", () => {
  it("accepts every journey and support module in the repo", () => {
    // arrange
    const directory = e2eRoot;

    // act
    const problems = auditFragileE2ePatterns(directory);

    // assert
    expect(problems).toEqual([]);
  });

  it.each([
    [
      "a heading found by name",
      'page.getByRole("heading", { name: "Clients", exact: true });',
    ],
    ["a heading found by role alone", 'page.getByRole("heading");'],
    [
      "a level on another role's options",
      'page.getByRole("treeitem", { level: 2 });',
    ],
    ["a test's own timeout", "test.setTimeout(90_000);"],
    [
      "a wait for a download",
      'const download = page.waitForEvent("download");',
    ],
    [
      "a wait for what the page shows",
      'await expect(page.getByRole("status")).toHaveText("Saved");',
    ],
  ])("accepts %s", (_name, text) => {
    // arrange
    const source = text;

    // act
    const problems = auditFragileE2ePatternsInSource("a.ts", source);

    // assert
    expect(problems).toEqual([]);
  });

  it.each([
    [
      "a heading found by level",
      'page.getByRole("heading", { level: 1 });',
      ["a.ts:1: selects a heading by level; find it by its name instead"],
    ],
    [
      "a heading found by level and name",
      'dialog.getByRole("heading", { level: 3, name: "Add resource" });',
      ["a.ts:1: selects a heading by level; find it by its name instead"],
    ],
    [
      "a fixed wait on the page",
      "await page.waitForTimeout(500);",
      [
        "a.ts:1: waits a fixed time; wait for what the user sees or the event instead",
      ],
    ],
    [
      "a sleep through setTimeout",
      "await new Promise((resolve) => setTimeout(resolve, 1_500));",
      [
        "a.ts:1: waits a fixed time; wait for what the user sees or the event instead",
      ],
    ],
    [
      "a wait for one file chooser",
      'const chooser = page.waitForEvent("filechooser");',
      [
        "a.ts:1: waits for one file chooser; open it through FileChoosers instead",
      ],
    ],
    [
      "a heading found by level on a later line",
      'const a = 1;\npage\n  .getByRole("heading", { level: 2 })\n  .click();',
      ["a.ts:3: selects a heading by level; find it by its name instead"],
    ],
  ])("rejects %s", (_name, text, expected) => {
    // arrange
    const source = text;

    // act
    const problems = auditFragileE2ePatternsInSource("a.ts", source);

    // assert
    expect(problems).toEqual(expected);
  });
});
