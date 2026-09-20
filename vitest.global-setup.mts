import { buildPlatformServer } from "./apps/platform/integration-test-config/platform-build";

const INTEGRATION_PROJECT_NAME = "integration";

type TestProject = { name: string };

/**
 * Vitest runs this once per project taking part in the run, which is what
 * makes the production server build unconditional for the integration suites
 * and free for every other run: a unit-only or filtered run never reaches the
 * integration project, so its setup is never initialized.
 */
export async function setup(project: TestProject): Promise<void> {
  if (project.name === INTEGRATION_PROJECT_NAME) {
    await buildPlatformServer();
  }
}
