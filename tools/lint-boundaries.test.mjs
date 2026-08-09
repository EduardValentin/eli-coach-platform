import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BOUNDARY_FENCED_FEATURES } from "../eslint.config.mjs";

const FEATURES_DIRECTORY = "apps/platform/src/features";

const APP_ALIAS_FIXTURE = "apps/platform/src/__lint__/nested/deep/violates-app-alias.ts";
const STORE_CROSS_FEATURE_FIXTURE =
  "apps/platform/src/features/store/__lint__/violates-cross-feature-import.ts";
const STORE_UI_SERVER_FIXTURE =
  "apps/platform/src/features/store/ui/public/__lint__/violates-ui-server-import.ts";
// The foreign-key carve-out is bound to this exact path, so there is nowhere to
// put a fixture file that the carve-out block would match. Linting source over
// stdin under this filename exercises the real production glob instead.
const STORE_DATA_SCHEMA_PATH =
  "apps/platform/src/features/store/data/schema.server.ts";

function parseLintResults(stdout, stderr) {
  if (!stdout) {
    throw new Error(`eslint produced no stdout to parse. stderr:\n${stderr}`);
  }

  return JSON.parse(stdout);
}

function lintFixture(fixturePath) {
  try {
    execFileSync("pnpm", ["exec", "eslint", "--no-ignore", "--format", "json", fixturePath], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return [];
  } catch (error) {
    return parseLintResults(error.stdout, error.stderr);
  }
}

function lintSourceAs(source, filePath) {
  const args = [
    "exec",
    "eslint",
    "--no-ignore",
    "--format",
    "json",
    "--stdin",
    "--stdin-filename",
    filePath,
  ];

  try {
    return parseLintResults(
      execFileSync("pnpm", args, { encoding: "utf8", input: source, stdio: "pipe" }),
      "",
    );
  } catch (error) {
    return parseLintResults(error.stdout, error.stderr);
  }
}

function collectMessages(results) {
  return results.flatMap((result) => result.messages);
}

describe("app-local import boundary", () => {
  it("reports no-restricted-imports on a deep relative import inside the app source tree", () => {
    // arrange
    const fixturePath = APP_ALIAS_FIXTURE;

    // act
    const results = lintFixture(fixturePath);
    const messages = collectMessages(results);
    const ruleIds = messages.map((message) => message.ruleId);

    // assert
    expect(ruleIds).toContain("no-restricted-imports");
    expect(messages.some((message) => message.message.includes("Use the app root alias"))).toBe(
      true,
    );
  });
});

describe("feature boundary coverage", () => {
  it("fences every feature that exists", () => {
    // arrange
    const featureDirectories = readdirSync(FEATURES_DIRECTORY, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // act
    const fenced = [...BOUNDARY_FENCED_FEATURES].sort();

    // assert
    expect(fenced).toEqual([...featureDirectories].sort());
  });
});

describe("store feature boundary", () => {
  it("reports no-restricted-imports when a non-ui store file imports another feature's internals", () => {
    // arrange
    const fixturePath = STORE_CROSS_FEATURE_FIXTURE;

    // act
    const results = lintFixture(fixturePath);
    const messages = collectMessages(results);
    const ruleIds = messages.map((message) => message.ruleId);

    // assert
    expect(ruleIds).toContain("no-restricted-imports");
    expect(
      messages.some((message) =>
        message.message.includes(
          "features/store/** must not import another feature's internals",
        ),
      ),
    ).toBe(true);
  });

  it("reports no-restricted-imports when a store ui file imports the store's own data layer", () => {
    // arrange
    const fixturePath = STORE_UI_SERVER_FIXTURE;

    // act
    const results = lintFixture(fixturePath);
    const messages = collectMessages(results);
    const ruleIds = messages.map((message) => message.ruleId);

    // assert
    expect(ruleIds).toContain("no-restricted-imports");
    expect(
      messages.some((message) =>
        message.message.includes(
          "features/*/ui/** must not import features/*/{data,api,email}/**",
        ),
      ),
    ).toBe(true);
  });

  it("allows the store schema to import another feature's data/schema.server for a foreign key", () => {
    // arrange
    const source = [
      'import { waitlistEntriesTable } from "~/features/waitlist/data/schema.server";',
      "",
      "export const foreignKeyTarget = waitlistEntriesTable;",
      "",
    ].join("\n");

    // act
    const results = lintSourceAs(source, STORE_DATA_SCHEMA_PATH);
    const messages = collectMessages(results);

    // assert
    expect(messages).toEqual([]);
  });

  it("reports no-restricted-imports when the store schema imports anything else of another feature's", () => {
    // arrange
    const source = [
      'import { WaitlistRepository } from "~/features/waitlist/data/repository.server";',
      "",
      "export const notAForeignKey = WaitlistRepository;",
      "",
    ].join("\n");

    // act
    const results = lintSourceAs(source, STORE_DATA_SCHEMA_PATH);
    const messages = collectMessages(results);
    const ruleIds = messages.map((message) => message.ruleId);

    // assert
    expect(ruleIds).toContain("no-restricted-imports");
    expect(
      messages.some((message) =>
        message.message.includes(
          "and <feature>/data/schema.server (for foreign keys) are public across features",
        ),
      ),
    ).toBe(true);
  });
});
