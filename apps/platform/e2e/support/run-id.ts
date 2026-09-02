const RUN_ID_ENV_VAR = "E2E_RUN_ID";

function generateRunId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 46_656).toString(36)}`;
}

// Playwright runs global-setup.ts once in the runner process, then spawns
// this suite's single worker process, which inherits process.env as it
// stood once global-setup.ts's promise resolved — global-teardown.ts then
// runs back in the runner process, where the same mutation is still in
// scope. Resolving (and, the first time, generating) the id through that one
// environment variable is what lets all three call sites agree on the same
// run without a shared in-memory module surviving process boundaries none of
// them can rely on — see clerk-users.ts's registry-file comment for why a
// file plays the same role for the emails themselves.
export function resolveRunId(): string {
  const existing = process.env[RUN_ID_ENV_VAR];

  if (existing) {
    return existing;
  }

  const runId = generateRunId();
  process.env[RUN_ID_ENV_VAR] = runId;

  return runId;
}
