import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const RELEASE_PLAN_SCRIPT = fileURLToPath(
  new URL("./release-plan.mjs", import.meta.url),
);
const UNKNOWN_COMMIT = "f".repeat(40);

let directory = "";
let commits = {};

function git(...args) {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  }).trim();
}

function commitFile(name) {
  writeFileSync(join(directory, name), name);
  git("add", name);
  git("commit", "--message", name);

  return git("rev-parse", "HEAD");
}

function promote(liveSha, candidateSha) {
  return spawnSync(
    "node",
    [RELEASE_PLAN_SCRIPT, "promote", liveSha, candidateSha],
    { cwd: directory, encoding: "utf8" },
  );
}

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "release-plan-"));
  git("init", "--quiet", "--initial-branch", "main");
  const first = commitFile("first");
  const second = commitFile("second");
  const third = commitFile("third");
  git("checkout", "--quiet", "--detach", first);
  const sideBranch = commitFile("side");

  commits = { first, second, third, sideBranch };
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("release-plan promote", () => {
  it("allows the first release when nothing is live", () => {
    // arrange
    const live = "none";

    // act
    const result = promote(live, commits.first);

    // assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No release is live");
  });

  it("allows a candidate that descends from the live release", () => {
    // arrange
    const live = commits.first;

    // act
    const result = promote(live, commits.third);

    // assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("is newer than the live");
  });

  it("refuses the commit that is already live", () => {
    // arrange
    const live = commits.second;

    // act
    const result = promote(live, commits.second);

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`${commits.second} is already live`);
  });

  it("refuses a candidate older than the live release and points at Rollback PROD", () => {
    // arrange
    const live = commits.third;

    // act
    const result = promote(live, commits.first);

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("use Rollback PROD");
  });

  it("refuses a candidate on a diverged line of history", () => {
    // arrange
    const live = commits.third;

    // act
    const result = promote(live, commits.sideBranch);

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("unrelated commits");
  });

  it("refuses when the live commit is not in this history", () => {
    // arrange
    const live = UNKNOWN_COMMIT;

    // act
    const result = promote(live, commits.third);

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("unrelated commits");
  });

  it("exits 2 when an argument is not a full commit hash", () => {
    // arrange
    const live = "main";

    // act
    const result = promote(live, commits.first);

    // assert
    expect(result.status).toBe(2);
  });
});
