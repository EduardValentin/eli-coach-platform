import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const FULL_COMMIT_HASH = /^[0-9a-f]{40}$/;
const NO_LIVE_RELEASE = "none";
const RELEASE_WORKFLOW_LOGIN = "github-actions[bot]";
const RELEASE_RECORD_SCHEMA = "prod-release/v1";
const MIGRATIONS_DIRECTORY = "apps/platform/db/drizzle/";
const PROD_IMAGE_REPOSITORIES = {
  platform: "ghcr.io/eduardvalentin/eli-coach-platform-platform",
  migration: "ghcr.io/eduardvalentin/eli-coach-platform-db-migrations",
  postgresRuntime: "ghcr.io/eduardvalentin/eli-coach-platform-postgres-runtime",
};
const IMAGE_DIGEST = /^@sha256:[0-9a-f]{64}$/;

function isAncestor({ ancestor, descendant }) {
  const { status } = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", ancestor, descendant],
    { stdio: "ignore" },
  );

  return status === 0;
}

function promotionVerdict(liveSha, candidateSha) {
  if (liveSha === null) {
    return { allowed: true, reason: "No release is live on PROD yet." };
  }
  if (liveSha === candidateSha) {
    return {
      allowed: false,
      reason: `${candidateSha} is already live on PROD.`,
    };
  }
  if (isAncestor({ ancestor: liveSha, descendant: candidateSha })) {
    return {
      allowed: true,
      reason: `${candidateSha} is newer than the live ${liveSha}.`,
    };
  }
  if (isAncestor({ ancestor: candidateSha, descendant: liveSha })) {
    return {
      allowed: false,
      reason: `${candidateSha} is older than the live ${liveSha}; use Rollback PROD.`,
    };
  }

  return {
    allowed: false,
    reason: `${candidateSha} and the live ${liveSha} are unrelated commits; the live commit is missing from this history or diverged from it.`,
  };
}

function isProdImage(imageName, reference) {
  if (!Object.hasOwn(PROD_IMAGE_REPOSITORIES, imageName)) {
    return false;
  }
  const repository = PROD_IMAGE_REPOSITORIES[imageName];

  return (
    typeof reference === "string" &&
    reference.startsWith(repository) &&
    IMAGE_DIGEST.test(reference.slice(repository.length))
  );
}

// --- rollback ---------------------------------------------------------------

// Superseded deployments turn inactive, so a release is any deployment that
// ever reached success. Only what the release workflow wrote counts.
function successfulReleaseRecords(deployments) {
  return deployments.flatMap((deployment) => {
    const { payload } = deployment;
    const success = deployment.statuses.find(
      (status) =>
        status.state === "success" && status.creator === RELEASE_WORKFLOW_LOGIN,
    );
    const isReleaseRecord =
      deployment.creator === RELEASE_WORKFLOW_LOGIN &&
      payload?.schema === RELEASE_RECORD_SCHEMA &&
      FULL_COMMIT_HASH.test(deployment.sha) &&
      payload.sha === deployment.sha;

    if (!isReleaseRecord || success === undefined) {
      return [];
    }

    return [
      {
        sha: deployment.sha,
        succeededAt: success.created_at,
        images: payload.images ?? {},
      },
    ];
  });
}

function latestRecordPerCommit(records) {
  const latestBySha = new Map();
  for (const record of records) {
    const known = latestBySha.get(record.sha);
    if (known === undefined || record.succeededAt > known.succeededAt) {
      latestBySha.set(record.sha, record);
    }
  }

  return [...latestBySha.values()];
}

function mostRecentlySucceeded(records) {
  return records.reduce((latest, record) =>
    record.succeededAt > latest.succeededAt ? record : latest,
  );
}

function commitsOldestFirst() {
  const output = execFileSync(
    "git",
    ["rev-list", "--topo-order", "--reverse", "HEAD"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );

  return output.trim().split("\n");
}

function migrationsChangedBetween({ from, to }) {
  const { status } = spawnSync(
    "git",
    ["diff", "--quiet", from, to, "--", MIGRATIONS_DIRECTORY],
    { stdio: "ignore" },
  );
  if (status !== 0 && status !== 1) {
    throw new Error(`git diff ${from} ${to} failed with status ${status}`);
  }

  return status === 1;
}

function commitSubject(sha) {
  return execFileSync("git", ["log", "-1", "--format=%s", sha], {
    encoding: "utf8",
  }).trim();
}

// Records of commits no longer on main are left out.
function releasesInMainOrder(records) {
  const positions = new Map(
    commitsOldestFirst().map((sha, position) => [sha, position]),
  );

  return records
    .filter((record) => positions.has(record.sha))
    .sort((left, right) => positions.get(left.sha) - positions.get(right.sha));
}

function withSubjectAndMigrationChange(releases) {
  return releases.map((release, index) => ({
    ...release,
    subject: commitSubject(release.sha),
    changesMigrations:
      index > 0 &&
      migrationsChangedBetween({
        from: releases[index - 1].sha,
        to: release.sha,
      }),
  }));
}

function refusal(reason) {
  return { allowed: false, reason };
}

function approval(reason) {
  return { allowed: true, reason };
}

function prodReleases(deployments) {
  const records = latestRecordPerCommit(successfulReleaseRecords(deployments));
  if (records.length === 0) {
    return {
      releases: [],
      refusal: refusal(
        "There are no past successful PROD deployments to roll back to.",
      ),
    };
  }

  const live = mostRecentlySucceeded(records);
  const releases = withSubjectAndMigrationChange(releasesInMainOrder(records));
  const liveIndex = releases.findIndex((release) => release.sha === live.sha);
  if (liveIndex === -1) {
    return {
      releases,
      refusal: refusal(
        `The live release ${live.sha} is not in main's history; fix the deployment records by hand.`,
      ),
    };
  }

  return { releases, liveIndex };
}

function rollbackTargetIndex({ releases, liveIndex, targetSha }) {
  if (targetSha !== undefined) {
    const targetIndex = releases.findIndex(
      (release) => release.sha === targetSha,
    );
    return targetIndex === -1
      ? { refusal: refusal(`${targetSha} was never deployed to PROD.`) }
      : { targetIndex };
  }
  if (liveIndex === 0) {
    return {
      refusal: refusal(
        `No release is older than the live ${releases[liveIndex].sha}; name a target_sha to roll forward.`,
      ),
    };
  }

  return { targetIndex: liveIndex - 1 };
}

// From the release after the target up to and including live; empty when
// rolling forward.
function releasesGoneBackOver({ releases, liveIndex, targetIndex }) {
  if (targetIndex === -1 || targetIndex >= liveIndex) {
    return [];
  }

  return releases.slice(targetIndex + 1, liveIndex + 1);
}

function releasesThatChangedMigrations(releases) {
  return releases.filter((release) => release.changesMigrations);
}

// These values become the rollback job's inputs, so each must be exactly one
// of this app's GHCR digests.
function nonProdImageRefusal({ target, live }) {
  const recorded = [
    ["platform", target],
    ["migration", live],
    ["postgresRuntime", live],
  ];
  const invalid = recorded.find(
    ([imageName, release]) =>
      !isProdImage(imageName, release.images[imageName]),
  );
  if (invalid === undefined) {
    return undefined;
  }

  const [imageName, release] = invalid;
  return refusal(
    `The ${imageName} image recorded for ${release.sha} is not a GHCR digest of this app.`,
  );
}

// Going back past the previous release crosses releases whose migrations stay
// applied; the person must say how many of those there are.
function unconfirmedMigrationsRefusal({ goneBackOver, confirmation }) {
  const migrationReleases = releasesThatChangedMigrations(goneBackOver);
  const migrationReleaseCount = String(migrationReleases.length);
  const targetIsThePreviousRelease = goneBackOver.length === 1;
  if (targetIsThePreviousRelease || confirmation === migrationReleaseCount) {
    return undefined;
  }

  const listed = migrationReleases
    .map((release) => `${release.sha} (${release.subject})`)
    .join(", ");
  return refusal(
    `The rollback goes back over ${goneBackOver.length} releases; ${migrationReleaseCount} of them changed ${MIGRATIONS_DIRECTORY}${listed ? `: ${listed}` : ""}. Their migrations stay applied. Run again with confirm_migration_releases=${migrationReleaseCount} to go ahead.`,
  );
}

function rollbackVerdict({ releases, liveIndex, targetIndex, confirmation }) {
  const target = releases[targetIndex];
  const live = releases[liveIndex];
  if (targetIndex === liveIndex) {
    return refusal(`${target.sha} is already live.`);
  }

  const imageRefusal = nonProdImageRefusal({ target, live });
  if (imageRefusal !== undefined) {
    return imageRefusal;
  }
  if (targetIndex > liveIndex) {
    return approval(`Roll forward from ${live.sha} to ${target.sha}.`);
  }

  const goneBackOver = releasesGoneBackOver({
    releases,
    liveIndex,
    targetIndex,
  });
  return (
    unconfirmedMigrationsRefusal({ goneBackOver, confirmation }) ??
    approval(`Roll back from ${live.sha} to ${target.sha}.`)
  );
}

function rollbackOutcome({
  verdict,
  releases,
  liveIndex = -1,
  targetIndex = -1,
}) {
  return {
    verdict,
    releases,
    liveIndex,
    targetIndex,
    goneBackOver: releasesGoneBackOver({ releases, liveIndex, targetIndex }),
  };
}

function rollbackPlan({ deployments, targetSha, confirmation }) {
  const {
    releases,
    liveIndex,
    refusal: releasesRefusal,
  } = prodReleases(deployments);
  if (releasesRefusal !== undefined) {
    return rollbackOutcome({ verdict: releasesRefusal, releases });
  }

  const { targetIndex, refusal: targetRefusal } = rollbackTargetIndex({
    releases,
    liveIndex,
    targetSha,
  });
  if (targetRefusal !== undefined) {
    return rollbackOutcome({ verdict: targetRefusal, releases, liveIndex });
  }

  const verdict = rollbackVerdict({
    releases,
    liveIndex,
    targetIndex,
    confirmation,
  });
  return rollbackOutcome({ verdict, releases, liveIndex, targetIndex });
}

function releaseMarkers({ index, liveIndex, targetIndex }) {
  const markers = [];
  if (index === liveIndex) {
    markers.push("live");
  }
  if (index === liveIndex - 1) {
    markers.push("default target");
  }
  if (index === targetIndex) {
    markers.push("target");
  }

  return markers.join(", ");
}

function migrationsCell(release, index) {
  if (index === 0) {
    return "n/a";
  }

  return release.changesMigrations ? "yes" : "no";
}

function markdownCell(text) {
  return text.replaceAll("|", "\\|");
}

function releaseTableLines({ releases, liveIndex, targetIndex }) {
  const rows = [...releases.entries()]
    .reverse()
    .map(
      ([index, release]) =>
        `| \`${release.sha}\` | ${release.succeededAt} | ${markdownCell(release.subject)} | ${releaseMarkers({ index, liveIndex, targetIndex })} | ${migrationsCell(release, index)} |`,
    );

  return [
    "| Release | Succeeded | Subject | Marker | Changed migrations |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ];
}

function goneBackOverLines(goneBackOver) {
  if (goneBackOver.length === 0) {
    return [];
  }

  const migrationReleaseCount =
    releasesThatChangedMigrations(goneBackOver).length;
  return [
    `Releases gone back over (N): ${goneBackOver.length}. Of those, releases that changed the migrations (M): ${migrationReleaseCount}.`,
    "",
  ];
}

function rollbackSummary(plan) {
  const lines = [
    "## Rollback PROD plan",
    "",
    plan.verdict.reason,
    "",
    ...goneBackOverLines(plan.goneBackOver),
    ...(plan.releases.length > 0 ? releaseTableLines(plan) : []),
  ];

  return `${lines.join("\n")}\n`;
}

function rollbackPlanOutputs(plan) {
  const live = plan.releases[plan.liveIndex];
  const target = plan.releases[plan.targetIndex];

  return {
    targetSha: target.sha,
    liveSha: live.sha,
    platformImage: target.images.platform,
    liveMigrationImage: live.images.migration,
    livePostgresRuntimeImage: live.images.postgresRuntime,
  };
}

// --- command line -----------------------------------------------------------

function usageError(message) {
  console.error(message);
  process.exitCode = 2;
}

function runPromote([liveArgument, candidateSha]) {
  const isCommitOrNone = (value) =>
    value === NO_LIVE_RELEASE || FULL_COMMIT_HASH.test(value ?? "");

  if (
    !isCommitOrNone(liveArgument) ||
    !FULL_COMMIT_HASH.test(candidateSha ?? "")
  ) {
    usageError(
      "usage: release-plan.mjs promote <live-commit|none> <candidate-commit>",
    );
    return;
  }

  const liveSha = liveArgument === NO_LIVE_RELEASE ? null : liveArgument;
  const { allowed, reason } = promotionVerdict(liveSha, candidateSha);

  console.log(reason);
  process.exitCode = allowed ? 0 : 1;
}

function runRollback(args) {
  const { values } = parseArgs({
    args,
    options: {
      deployments: { type: "string" },
      plan: { type: "string" },
      target: { type: "string", default: "" },
      "confirm-migration-releases": { type: "string", default: "" },
    },
  });
  const { deployments, plan: planPath, target } = values;
  const confirmation = values["confirm-migration-releases"];

  if (
    deployments === undefined ||
    planPath === undefined ||
    !(target === "" || FULL_COMMIT_HASH.test(target)) ||
    !/^(\d+)?$/.test(confirmation)
  ) {
    usageError(
      "usage: release-plan.mjs rollback --deployments <file> --plan <file> [--target <full commit>] [--confirm-migration-releases <count>]",
    );
    return;
  }

  const plan = rollbackPlan({
    deployments: JSON.parse(readFileSync(deployments, "utf8")),
    targetSha: target || undefined,
    confirmation,
  });

  console.log(rollbackSummary(plan));
  if (plan.verdict.allowed) {
    writeFileSync(planPath, JSON.stringify(rollbackPlanOutputs(plan)));
  }
  process.exitCode = plan.verdict.allowed ? 0 : 1;
}

function runCheckProdImage([imageName, reference]) {
  if (reference === undefined) {
    usageError(
      `usage: release-plan.mjs check-prod-image <${Object.keys(PROD_IMAGE_REPOSITORIES).join("|")}> <reference>`,
    );
    return;
  }
  if (isProdImage(imageName, reference)) {
    return;
  }

  console.error(
    `${reference} is not a ${imageName} image digest from ${PROD_IMAGE_REPOSITORIES[imageName] ?? "a known repository"}.`,
  );
  process.exitCode = 1;
}

const COMMANDS = {
  promote: runPromote,
  rollback: runRollback,
  "check-prod-image": runCheckProdImage,
};

function main([command, ...args]) {
  if (!Object.hasOwn(COMMANDS, command ?? "")) {
    usageError(
      `usage: release-plan.mjs <${Object.keys(COMMANDS).join("|")}> ...`,
    );
    return;
  }

  COMMANDS[command](args);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2));
}
