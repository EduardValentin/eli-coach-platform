import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const fixturesRoot = resolve(import.meta.dirname, "boundary-fixtures");
const expectedViolations = JSON.parse(
  readFileSync(resolve(fixturesRoot, "expected-violations.json"), "utf8"),
);

const knipFixturesRoot = resolve(fixturesRoot, "knip");

function cruiseFixtures() {
  let stdout;
  try {
    stdout = execFileSync(
      "pnpm",
      [
        "--silent",
        "exec",
        "depcruise",
        "--config",
        "../dependency-cruiser.config.cjs",
        "--output-type",
        "json",
        "--no-cache",
        "apps/platform/src",
        "packages",
      ],
      { cwd: fixturesRoot, encoding: "utf8", stdio: "pipe" },
    );
  } catch (error) {
    stdout = error.stdout;
  }
  return JSON.parse(stdout).summary.violations;
}

describe("boundary rules", () => {
  const violations = cruiseFixtures();

  it.each(Object.entries(expectedViolations))("%s trips %j", (fixture, rules) => {
    // arrange
    const forFixture = violations.filter((violation) => violation.from === fixture);

    // act
    const firedRules = new Set(forFixture.map((violation) => violation.rule.name));

    // assert
    expect([...firedRules].sort()).toEqual([...rules].sort());
  });

  it("reports nothing the fixtures do not expect", () => {
    // arrange
    const expectedFrom = new Set(Object.keys(expectedViolations));

    // act
    const unexpected = violations.filter(
      (violation) =>
        !expectedFrom.has(violation.from) ||
        !expectedViolations[violation.from].includes(violation.rule.name),
    );

    // assert
    expect(unexpected).toEqual([]);
  });
});

function inspectKnipFixtures() {
  let stdout;
  try {
    stdout = execFileSync(
      "pnpm",
      ["--silent", "exec", "knip", "--reporter", "json"],
      { cwd: knipFixturesRoot, encoding: "utf8", stdio: "pipe" },
    );
  } catch (error) {
    stdout = error.stdout;
  }
  return JSON.parse(stdout).issues;
}

describe("published surface rules", () => {
  it("reports an export no other module consumes", () => {
    // arrange
    const issues = inspectKnipFixtures();

    // act
    const unusedExports = issues.flatMap((issue) =>
      issue.exports.map((unusedExport) => `${issue.file}:${unusedExport.name}`),
    );

    // assert
    expect(unusedExports).toEqual(["src/module.ts:unconsumedValue"]);
  });
});
