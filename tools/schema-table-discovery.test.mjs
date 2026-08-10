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
// this does not duplicate that. It catches the cause first, by asserting
// which tables drizzle-kit actually discovers: a table becoming invisible
// shows up as a named omission rather than as a destructive migration. A
// name set also catches a swap (one table lost, one gained) that a bare
// count would miss entirely.
//
// Note this does not model drizzle-kit's resolution — it runs the real thing.
// The config's globs name entry points and drizzle-kit follows their imports,
// so a file need not be matched directly to be seen. Modelling that was the
// first version of this test and it produced false positives.
//
// Migrations are written to a throwaway directory so a drifted working tree
// can never leave a generated migration behind in the repo.
//
// When a table is legitimately added or removed, update EXPECTED_TABLES in
// the same commit. That is the point: it forces the change to be visible and
// deliberate.

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_TABLES = [
  "acquisition_requests",
  "acquisitions",
  "delivery_attempts",
  "download_grant_items",
  "download_grants",
  "feature_flags",
  "product_goals",
  "product_types",
  "product_version_assets",
  "product_version_goal_assignments",
  "product_version_type_assignments",
  "product_versions",
  "products",
  "store_asset_identities",
  "store_recipients",
  "waitlist_entries",
];

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
    const expectedTables = new Set(EXPECTED_TABLES);

    // act
    const output = await runDrizzleGenerate();
    const discoveredTables = [...output.matchAll(/^(\S+) \d+ columns/gm)].map((match) => match[1]);
    const discoveredTableSet = new Set(discoveredTables);

    // assert
    const missingTables = EXPECTED_TABLES.filter((table) => !discoveredTableSet.has(table));
    const unexpectedTables = discoveredTables.filter((table) => !expectedTables.has(table));

    expect(
      { missingTables, unexpectedTables },
      `drizzle-kit discovered a different set of tables than expected. ` +
        `Missing (expected but not discovered — a schema file has most likely moved out from under the globs ` +
        `in apps/platform/db/drizzle.config.ts, and drizzle-kit will generate DROP TABLE for these): ` +
        `${missingTables.join(", ") || "none"}. ` +
        `Unexpected (discovered but not in EXPECTED_TABLES — a table was added without updating this guard): ` +
        `${unexpectedTables.join(", ") || "none"}.`,
    ).toEqual({ missingTables: [], unexpectedTables: [] });
  });
});
