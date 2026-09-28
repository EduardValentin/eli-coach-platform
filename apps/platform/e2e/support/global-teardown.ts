import { createClerkClient } from "@clerk/backend";

import { stopEmailCapture } from "./email-capture";
import { loadE2eEnvironment, requireEnv } from "./env";
import { cleanUpRun } from "./run-cleanup";
import { resolveRunId } from "./run-id";

export default async function globalTeardown() {
  loadE2eEnvironment();

  await stopEmailCapture();
  await cleanUpRun(
    createClerkClient({ secretKey: requireEnv("CLERK_SECRET_KEY") }),
    resolveRunId(),
    "[e2e cleanup]",
  );
}
