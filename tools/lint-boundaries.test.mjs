import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const APP_ALIAS_FIXTURE = "apps/platform/src/__lint__/nested/deep/violates-app-alias.ts";

function lintFixture(fixturePath) {
  try {
    execFileSync("pnpm", ["exec", "eslint", "--no-ignore", "--format", "json", fixturePath], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return [];
  } catch (error) {
    if (!error.stdout) {
      throw new Error(`eslint produced no stdout to parse. stderr:\n${error.stderr}`);
    }
    return JSON.parse(error.stdout);
  }
}

describe("app-local import boundary", () => {
  it("reports no-restricted-imports on a deep relative import inside the app source tree", () => {
    // arrange
    const fixturePath = APP_ALIAS_FIXTURE;

    // act
    const results = lintFixture(fixturePath);
    const messages = results.flatMap((result) => result.messages);
    const ruleIds = messages.map((message) => message.ruleId);

    // assert
    expect(ruleIds).toContain("no-restricted-imports");
    expect(messages.some((message) => message.message.includes("Use the app root alias"))).toBe(
      true,
    );
  });
});
