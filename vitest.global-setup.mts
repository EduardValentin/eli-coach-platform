import { execFile } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const runCommand = promisify(execFile);
const workspaceRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Typecheck before any test runs.
 *
 * Vitest transpiles TypeScript without checking it, so a named import that
 * does not exist arrives as `undefined` at runtime instead of failing. A test
 * can then pass while asserting against nothing. Running the checker here
 * covers focused runs too, which is where that gap actually bites: a full
 * `pnpm test` is not what someone runs while iterating on one file.
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
