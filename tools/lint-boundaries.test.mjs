import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

// Path is updated by the app/ -> src/ rename in Task 2.
const APP_ALIAS_FIXTURE = "apps/platform/app/__lint__/nested/deep/violates-app-alias.ts";

function lintFixture(fixturePath) {
  try {
    execFileSync("pnpm", ["exec", "eslint", "--no-ignore", "--format", "json", fixturePath], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return [];
  } catch (error) {
    return JSON.parse(error.stdout);
  }
}

describe("app-local import boundary", () => {
  it("reports no-restricted-imports on a deep relative import inside the app source tree", () => {
    // arrange
    const fixturePath = APP_ALIAS_FIXTURE;

    // act
    const results = lintFixture(fixturePath);
    const ruleIds = results.flatMap((result) => result.messages.map((message) => message.ruleId));

    // assert
    expect(ruleIds).toContain("no-restricted-imports");
  });
});
