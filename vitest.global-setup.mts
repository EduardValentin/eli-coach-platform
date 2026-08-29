import { execFile } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { buildPlatformServer } from "./apps/platform/integration-test-config/platform-build";

const runCommand = promisify(execFile);
const workspaceRoot = dirname(fileURLToPath(import.meta.url));
const INTEGRATION_PROJECT_NAME = "integration";

type TestProject = { name: string };

/**
 * Vitest transpiles TypeScript without checking it, so a named import that
 * does not exist arrives as `undefined` instead of failing, and a test can
 * pass while asserting against nothing.
 *
 * Vitest runs this once per project taking part in the run, which is what
 * makes the build below both unconditional for the integration suites and
 * free for every other run: a unit-only or filtered run never reaches the
 * integration project, so its setup is never initialized.
 */
export async function setup(project: TestProject): Promise<void> {
  await typecheck();

  if (project.name === INTEGRATION_PROJECT_NAME) {
    await buildPlatformServer();
  }
}

async function typecheck(): Promise<void> {
  try {
    await runCommand("pnpm", ["typecheck"], { cwd: workspaceRoot });
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: string; stderr?: string };

    throw new Error(
      `Typecheck failed, so no tests were run.\n\n${stdout ?? ""}${stderr ?? ""}`,
    );
  }
}
