import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
  const file = join(directory, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, name);
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

const RELEASE_BOT = "github-actions[bot]";
const PLATFORM_REPOSITORY =
  "ghcr.io/eduardvalentin/eli-coach-platform-platform";

function platformImageOf(sha) {
  return `${PLATFORM_REPOSITORY}@sha256:${sha.slice(0, 24).padEnd(64, "0")}`;
}

function successfulProdDeployment({ sha, succeededAt, kind = "release" }) {
  return {
    id: Date.parse(succeededAt),
    sha,
    created_at: succeededAt,
    creator: RELEASE_BOT,
    payload: {
      schema: "prod-release/v1",
      kind,
      sha,
      previousSha: "",
      images: {
        platform: platformImageOf(sha),
        migration: `ghcr.io/eduardvalentin/eli-coach-platform-db-migrations@sha256:${"1".repeat(64)}`,
        postgresRuntime: `ghcr.io/eduardvalentin/eli-coach-platform-postgres-runtime@sha256:${"2".repeat(64)}`,
      },
    },
    statuses: [
      { state: "success", created_at: succeededAt, creator: RELEASE_BOT },
    ],
  };
}

describe("release-plan rollback", () => {
  let history = {};
  let workDirectory = "";

  function planRollback({ deployments, target, confirmation }) {
    const deploymentsFile = join(workDirectory, "deployments.json");
    const planFile = join(workDirectory, "plan.json");
    rmSync(planFile, { force: true });
    writeFileSync(deploymentsFile, JSON.stringify(deployments));
    const args = [
      RELEASE_PLAN_SCRIPT,
      "rollback",
      "--deployments",
      deploymentsFile,
      "--plan",
      planFile,
    ];
    if (target !== undefined) {
      args.push("--target", target);
    }
    if (confirmation !== undefined) {
      args.push("--confirm-migration-releases", confirmation);
    }
    const result = spawnSync("node", args, {
      cwd: directory,
      encoding: "utf8",
    });
    return {
      ...result,
      plan: existsSync(planFile)
        ? JSON.parse(readFileSync(planFile, "utf8"))
        : null,
    };
  }

  // Releases r1..r5 on main; r2 and r4 change the migrations.
  function fiveReleases() {
    return ["r1", "r2", "r3", "r4", "r5"].map((name, index) =>
      successfulProdDeployment({
        sha: history[name],
        succeededAt: `2026-11-0${index + 1}T10:00:00Z`,
      }),
    );
  }

  beforeAll(() => {
    workDirectory = mkdtempSync(join(tmpdir(), "rollback-plan-"));
    git("checkout", "--quiet", "main");
    history = {
      r1: commitFile("apps/platform/src/one.ts"),
      r2: commitFile("apps/platform/db/drizzle/0001_add.sql"),
      r3: commitFile("apps/platform/src/three.ts"),
      r4: commitFile("apps/platform/db/drizzle/0002_add.sql"),
      r5: commitFile("apps/platform/db/seeds/five.sql"),
      unreleased: commitFile("apps/platform/src/six.ts"),
    };
  });

  afterAll(() => {
    rmSync(workDirectory, { recursive: true, force: true });
  });

  it("refuses when PROD has no past successful deployments and touches nothing", () => {
    // arrange
    const deployments = [];

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("no past successful PROD deployments");
    expect(result.plan).toBeNull();
  });

  it("targets the release before the live one by default", () => {
    // arrange
    const deployments = fiveReleases();

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.status).toBe(0);
    expect(result.plan).toMatchObject({
      targetSha: history.r4,
      liveSha: history.r5,
      platformImage: platformImageOf(history.r4),
    });
  });

  it("refuses a commit that was never deployed to PROD", () => {
    // arrange
    const deployments = fiveReleases();

    // act
    const result = planRollback({ deployments, target: history.unreleased });

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      `${history.unreleased} was never deployed to PROD`,
    );
    expect(result.plan).toBeNull();
  });

  it("refuses the release that is already live", () => {
    // arrange
    const deployments = fiveReleases();

    // act
    const result = planRollback({ deployments, target: history.r5 });

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`${history.r5} is already live`);
  });

  it("rolls forward to a release newer than live without confirmation", () => {
    // arrange
    const deployments = [
      ...fiveReleases(),
      successfulProdDeployment({
        sha: history.r2,
        succeededAt: "2026-11-09T10:00:00Z",
        kind: "rollback",
      }),
    ];

    // act
    const result = planRollback({ deployments, target: history.r4 });

    // assert
    expect(result.status).toBe(0);
    expect(result.plan).toMatchObject({
      targetSha: history.r4,
      liveSha: history.r2,
    });
  });

  it("orders releases by ancestry after an earlier rollback", () => {
    // arrange
    const deployments = [
      ...fiveReleases(),
      successfulProdDeployment({
        sha: history.r3,
        succeededAt: "2026-11-09T10:00:00Z",
        kind: "rollback",
      }),
    ];

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.status).toBe(0);
    expect(result.plan).toMatchObject({
      targetSha: history.r2,
      liveSha: history.r3,
    });
  });

  it("asks for the migration-release count when the target is older than the previous release", () => {
    // arrange
    const deployments = fiveReleases();

    // act
    const result = planRollback({ deployments, target: history.r2 });

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("confirm_migration_releases=1");
    expect(result.stdout).toContain(history.r4);
    expect(result.plan).toBeNull();
  });

  it("counts the live release's own migrations", () => {
    // arrange
    const deployments = fiveReleases().slice(0, 4);

    // act
    const result = planRollback({
      deployments,
      target: history.r2,
      confirmation: "1",
    });

    // assert
    expect(result.status).toBe(0);
    expect(result.plan).toMatchObject({
      targetSha: history.r2,
      liveSha: history.r4,
    });
  });

  it("counts the live release when it changed the migrations itself", () => {
    // arrange
    const deployments = fiveReleases().slice(0, 4);

    // act
    const confirmedExcludingLive = planRollback({
      deployments,
      target: history.r1,
      confirmation: "1",
    });
    const confirmedIncludingLive = planRollback({
      deployments,
      target: history.r1,
      confirmation: "2",
    });

    // assert
    expect(confirmedExcludingLive.status).toBe(1);
    expect(confirmedExcludingLive.stdout).toContain(
      "confirm_migration_releases=2",
    );
    expect(confirmedIncludingLive.status).toBe(0);
    expect(confirmedIncludingLive.plan.targetSha).toBe(history.r1);
  });

  it("refuses a confirmation that does not match the migration-release count", () => {
    // arrange
    const deployments = fiveReleases();

    // act
    const result = planRollback({
      deployments,
      target: history.r1,
      confirmation: "1",
    });

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("confirm_migration_releases=2");
    expect(result.plan).toBeNull();
  });

  it("accepts an older target once the migration-release count is confirmed", () => {
    // arrange
    const deployments = fiveReleases();

    // act
    const result = planRollback({
      deployments,
      target: history.r1,
      confirmation: "2",
    });

    // assert
    expect(result.status).toBe(0);
    expect(result.plan.targetSha).toBe(history.r1);
  });

  it("still counts a superseded release whose latest status is inactive", () => {
    // arrange
    const deployments = fiveReleases();
    deployments[3].statuses.unshift({
      state: "inactive",
      created_at: "2026-11-05T10:00:00Z",
      creator: RELEASE_BOT,
    });

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.status).toBe(0);
    expect(result.plan.targetSha).toBe(history.r4);
  });

  it("ignores deployments that never succeeded", () => {
    // arrange
    const deployments = fiveReleases();
    deployments[3].statuses = [
      {
        state: "failure",
        created_at: "2026-11-04T10:00:00Z",
        creator: RELEASE_BOT,
      },
    ];

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.status).toBe(0);
    expect(result.plan.targetSha).toBe(history.r3);
  });

  it("reads only deployments and statuses the release workflow wrote", () => {
    // arrange
    const deployments = fiveReleases();
    const forgedRelease = successfulProdDeployment({
      sha: history.unreleased,
      succeededAt: "2026-11-09T10:00:00Z",
    });
    forgedRelease.creator = "someone";
    deployments.push(forgedRelease);
    deployments[3].statuses = [
      {
        state: "success",
        created_at: "2026-11-04T10:00:00Z",
        creator: "someone",
      },
      {
        state: "failure",
        created_at: "2026-11-04T09:00:00Z",
        creator: RELEASE_BOT,
      },
    ];

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.status).toBe(0);
    expect(result.plan).toMatchObject({
      targetSha: history.r3,
      liveSha: history.r5,
    });
  });

  it("refuses a target whose recorded platform image is not this app's GHCR digest", () => {
    // arrange
    const deployments = fiveReleases();
    deployments[3].payload.images.platform = "docker.io/library/nginx:latest";

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("not a GHCR digest of this app");
    expect(result.plan).toBeNull();
  });

  it("refuses when the live release's database images are not this app's GHCR digests", () => {
    // arrange
    const deployments = fiveReleases();
    deployments[4].payload.images.migration = `m\ntarget_sha=${history.unreleased}`;

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      `The migration image recorded for ${history.r5} is not a GHCR digest`,
    );
    expect(result.plan).toBeNull();
  });

  it("lists every release with its live and target markers in the summary", () => {
    // arrange
    const deployments = fiveReleases();

    // act
    const result = planRollback({ deployments });

    // assert
    expect(result.stdout).toMatch(new RegExp(`${history.r5}.*live`));
    expect(result.stdout).toMatch(new RegExp(`${history.r4}.*default target`));
    expect(result.stdout).toContain("apps/platform/db/drizzle/0002_add.sql");
  });
});

describe("release-plan check-prod-image", () => {
  function checkProdImage(kind, reference) {
    return spawnSync(
      "node",
      [RELEASE_PLAN_SCRIPT, "check-prod-image", kind, reference],
      { encoding: "utf8" },
    );
  }

  it("accepts this app's GHCR digest for the named image", () => {
    // arrange
    const reference = `ghcr.io/eduardvalentin/eli-coach-platform-db-migrations@sha256:${"a".repeat(64)}`;

    // act
    const result = checkProdImage("migration", reference);

    // assert
    expect(result.status).toBe(0);
  });

  it("names the Postgres runtime image as the deployment payload does", () => {
    // arrange
    const reference = `ghcr.io/eduardvalentin/eli-coach-platform-postgres-runtime@sha256:${"b".repeat(64)}`;

    // act
    const result = checkProdImage("postgresRuntime", reference);

    // assert
    expect(result.status).toBe(0);
  });

  it("refuses an empty reference", () => {
    // arrange
    const reference = "";

    // act
    const result = checkProdImage("platform", reference);

    // assert
    expect(result.status).toBe(1);
  });

  it("refuses a tag, another registry or another image's repository", () => {
    // arrange
    const references = [
      `${PLATFORM_REPOSITORY}:latest`,
      `docker.io/eduardvalentin/eli-coach-platform-platform@sha256:${"a".repeat(64)}`,
      `ghcr.io/eduardvalentin/eli-coach-platform-postgres-runtime@sha256:${"a".repeat(64)}`,
    ];

    // act
    const statuses = references.map(
      (reference) => checkProdImage("platform", reference).status,
    );

    // assert
    expect(statuses).toEqual([1, 1, 1]);
  });
});
