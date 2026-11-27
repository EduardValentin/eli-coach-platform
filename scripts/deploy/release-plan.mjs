import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const FULL_COMMIT_HASH = /^[0-9a-f]{40}$/;
const NO_LIVE_RELEASE = "none";

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

function main([command, liveArgument, candidateSha]) {
  const isCommitOrNone = (value) =>
    value === NO_LIVE_RELEASE || FULL_COMMIT_HASH.test(value ?? "");

  if (
    command !== "promote" ||
    !isCommitOrNone(liveArgument) ||
    !FULL_COMMIT_HASH.test(candidateSha ?? "")
  ) {
    console.error(
      "usage: release-plan.mjs promote <live-commit|none> <candidate-commit>",
    );
    process.exitCode = 2;
    return;
  }

  const liveSha = liveArgument === NO_LIVE_RELEASE ? null : liveArgument;
  const { allowed, reason } = promotionVerdict(liveSha, candidateSha);

  console.log(reason);
  process.exitCode = allowed ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2));
}
