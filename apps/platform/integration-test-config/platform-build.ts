import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const runCommand = promisify(execFile);
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRootPath = resolve(currentDirectory, "../../..");

/**
 * Produces the artifact the suites serve: the one production build every
 * deployment runs, built before the first suite starts.
 */
export async function buildPlatformServer(): Promise<void> {
  try {
    await runCommand(
      "pnpm",
      ["--filter", "@eli-coach-platform/platform", "build"],
      {
        cwd: workspaceRootPath,
        // Vitest exports NODE_ENV=test, which would make this a development
        // build rather than the artifact the image deploys.
        env: {
          ...process.env,
          NODE_ENV: "production",
        },
        // Vite's build output (chunk sizes, future-flag warnings) can exceed
        // `execFile`'s 1 MB default, which truncates stdout with an
        // ERR_CHILD_PROCESS_STDIO_MAXBUFFER before the catch below can turn
        // it into a readable error.
        maxBuffer: 16 * 1024 * 1024,
      },
    );
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: string; stderr?: string };

    throw new Error(
      `The platform build failed, so no integration test could run.\n\n${stdout ?? ""}${stderr ?? ""}`,
    );
  }
}
