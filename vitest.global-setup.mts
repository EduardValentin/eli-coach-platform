import { execFile } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const runCommand = promisify(execFile);
const workspaceRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Vitest transpiles TypeScript without checking it, so a named import that
 * does not exist arrives as `undefined` instead of failing, and a test can
 * pass while asserting against nothing.
 */
export async function setup(): Promise<void> {
  try {
    await runCommand("pnpm", ["typecheck"], { cwd: workspaceRoot });
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: string; stderr?: string };

    throw new Error(
      `Typecheck failed, so no tests were run.\n\n${stdout ?? ""}${stderr ?? ""}`,
    );
  }
}
