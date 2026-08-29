import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv, promisify } from "node:util";

const runCommand = promisify(execFile);
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRootPath = resolve(currentDirectory, "../../..");
const integrationEnvironmentFilePath = resolve(
  currentDirectory,
  "./.env.integration",
);

/**
 * Produces the artifact the suites serve. It has to be built rather than
 * reused because `react-router.config.ts` bakes `APP_BASE_PATH` into the
 * router's basename at build time, so a build made for local development
 * answers on different paths than the integration environment declares.
 *
 * The file is parsed rather than loaded into this process: the integration
 * environment belongs to the servers the suites spawn, and vitest's forked
 * test processes inherit whatever is set here.
 */
export async function buildPlatformServer(): Promise<void> {
  const basePath = parseEnv(
    readFileSync(integrationEnvironmentFilePath, "utf8"),
  ).APP_BASE_PATH;

  if (!basePath) {
    throw new Error(
      `APP_BASE_PATH is missing from ${integrationEnvironmentFilePath}.`,
    );
  }

  try {
    await runCommand(
      "pnpm",
      ["--filter", "@eli-coach-platform/platform", "build"],
      {
        cwd: workspaceRootPath,
        // `process.loadEnvFile` in the router config leaves an already-set
        // variable alone, so this wins over a developer's local `.env`.
        env: { ...process.env, APP_BASE_PATH: basePath },
      },
    );
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: string; stderr?: string };

    throw new Error(
      `The platform build failed, so no integration test could run.\n\n${stdout ?? ""}${stderr ?? ""}`,
    );
  }
}
