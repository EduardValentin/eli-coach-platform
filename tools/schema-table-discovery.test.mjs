import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// TEMPORARY — remove when the feature-first restructure is finished.
//
// While tables migrate between packages, a schema file can fall outside
// drizzle-kit's reach. drizzle-kit does not error when that happens: it simply
// sees fewer tables than exist and generates DROP TABLE for the ones it can no
// longer find. That happened once during this restructure and was caught only
// by a manual `pnpm db:generate`.
//
// CI's fail-if-dirty gate already catches drift once a migration exists, so
// this does not duplicate that. It catches the cause first, by asserting how
// many tables drizzle-kit actually discovers: a table becoming invisible shows
// up as a count mismatch rather than as a destructive migration.
//
// Note this does not model drizzle-kit's resolution — it runs the real thing.
// The config's globs name entry points and drizzle-kit follows their imports,
// so a file need not be matched directly to be seen. Modelling that was the
// first version of this test and it produced false positives.
//
// Migrations are written to a throwaway directory so a drifted working tree
// can never leave a generated migration behind in the repo.
//
// When a table is legitimately added, bump EXPECTED_TABLE_COUNT in the same
// commit. That is the point: it forces the change to be visible and deliberate.

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_TABLE_COUNT = 16;

async function runDrizzleGenerate() {
  const scratchMigrations = await mkdtemp(join(tmpdir(), "drizzle-guard-"));
  try {
    const output = execFileSync("pnpm", ["db:generate"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, DATABASE_MIGRATIONS_FOLDER: scratchMigrations },
    });
    return output;
  } finally {
    await rm(scratchMigrations, { force: true, recursive: true });
  }
}

describe("drizzle schema discovery", () => {
  it("still finds every table the schema defines", async () => {
    // arrange
    const expectedTableCount = EXPECTED_TABLE_COUNT;

    // act
    const output = await runDrizzleGenerate();
    const discoveredTableCount = [...output.matchAll(/^\S+ \d+ columns/gm)].length;

    // assert
    expect(
      discoveredTableCount,
      `drizzle-kit discovered ${discoveredTableCount} tables but ${expectedTableCount} are expected. ` +
        `A schema file has most likely moved out from under the globs in apps/platform/db/drizzle.config.ts. ` +
        `drizzle-kit does not error on this — it generates DROP TABLE for every table it can no longer see. ` +
        `Widen the globs, or bump EXPECTED_TABLE_COUNT if a table was deliberately removed.`,
    ).toBe(expectedTableCount);
  });

});
