import { existsSync, rmSync, utimesSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { recordCreatedEmail } from "./clerk-users";
import { e2eDirectory } from "./repo-paths";
import { findLeftoverRunIds, findPossiblyActiveRunIds } from "./run-cleanup";
import { recordStoreProduct } from "./store-products";

const runtimeDirectory = resolve(e2eDirectory, ".runtime");
// Mirrors run-cleanup.ts's own MIN_LEFTOVER_AGE_MS. Not imported, because
// that constant is deliberately unexported — the guard's threshold is an
// implementation detail, and a test importing it could no longer tell "the
// guard uses the wrong constant" from "the guard used the right constant
// wrong."
const MIN_LEFTOVER_AGE_MS = 2 * 60 * 60 * 1000;

function uniqueRunId(label: string): string {
  return `test-${label}-${Date.now().toString(36)}-${Math.floor(Math.random() * 46_656).toString(36)}`;
}

function registryPathFor(runId: string): string {
  return resolve(runtimeDirectory, `created-emails-${runId}.log`);
}

function storeProductsPathFor(runId: string): string {
  return resolve(runtimeDirectory, `store-products-${runId}.log`);
}

// A registry always writes with the real current mtime, so a scenario
// proving the age guard has to backdate a file after writing it.
function backdateRegistryFile(runId: string, ageMs: number): void {
  backdateFile(registryPathFor(runId), ageMs);
}

function backdateFile(path: string, ageMs: number): void {
  const timestamp = new Date(Date.now() - ageMs);
  utimesSync(path, timestamp, timestamp);
}

describe("leftover-run sweep", () => {
  const createdRunIds: string[] = [];

  afterEach(() => {
    for (const runId of createdRunIds.splice(0)) {
      for (const path of [
        registryPathFor(runId),
        storeProductsPathFor(runId),
      ]) {
        if (existsSync(path)) {
          rmSync(path);
        }
      }
    }
  });

  it("finds other runs' leftover registry files old enough to sweep, but excludes the current run", () => {
    // arrange
    const currentRunId = uniqueRunId("current");
    const leftoverRunId = uniqueRunId("leftover");
    createdRunIds.push(currentRunId, leftoverRunId);
    recordCreatedEmail("current+clerk_test@evoa.fit", currentRunId);
    recordCreatedEmail("leftover+clerk_test@evoa.fit", leftoverRunId);
    backdateRegistryFile(leftoverRunId, MIN_LEFTOVER_AGE_MS + 60_000);

    // act
    const leftovers = findLeftoverRunIds(currentRunId);

    // assert
    expect(leftovers).toContain(leftoverRunId);
    expect(leftovers).not.toContain(currentRunId);
  });

  it("excludes a foreign registry file younger than the age guard from the sweep", () => {
    // arrange
    const currentRunId = uniqueRunId("current");
    const activeRunId = uniqueRunId("active");
    createdRunIds.push(currentRunId, activeRunId);
    recordCreatedEmail("current+clerk_test@evoa.fit", currentRunId);
    // No backdating: a suite still writing to its own file has a fresh mtime.
    recordCreatedEmail("active+clerk_test@evoa.fit", activeRunId);

    // act
    const leftovers = findLeftoverRunIds(currentRunId);

    // assert
    expect(leftovers).not.toContain(activeRunId);
  });

  it("reports a foreign registry file younger than the age guard as possibly active", () => {
    // arrange
    const currentRunId = uniqueRunId("current");
    const activeRunId = uniqueRunId("active");
    const oldRunId = uniqueRunId("old");
    createdRunIds.push(currentRunId, activeRunId, oldRunId);
    recordCreatedEmail("current+clerk_test@evoa.fit", currentRunId);
    recordCreatedEmail("active+clerk_test@evoa.fit", activeRunId);
    recordCreatedEmail("old+clerk_test@evoa.fit", oldRunId);
    backdateRegistryFile(oldRunId, MIN_LEFTOVER_AGE_MS + 60_000);

    // act
    const possiblyActive = findPossiblyActiveRunIds(currentRunId);

    // assert
    expect(possiblyActive).toContain(activeRunId);
    expect(possiblyActive).not.toContain(oldRunId);
    expect(possiblyActive).not.toContain(currentRunId);
  });

  it("finds a leftover run that recorded only store products once its registry is old enough to sweep", () => {
    // arrange
    const currentRunId = uniqueRunId("current");
    const storeOnlyRunId = uniqueRunId("store-only");
    createdRunIds.push(currentRunId, storeOnlyRunId);
    recordStoreProduct("glute-plan-store-only", storeOnlyRunId);
    backdateFile(
      storeProductsPathFor(storeOnlyRunId),
      MIN_LEFTOVER_AGE_MS + 60_000,
    );

    // act
    const leftovers = findLeftoverRunIds(currentRunId);

    // assert
    expect(leftovers).toContain(storeOnlyRunId);
  });

  it("keeps a run off the sweep while any of its registries was written within the age guard", () => {
    // arrange
    const currentRunId = uniqueRunId("current");
    const activeRunId = uniqueRunId("active");
    createdRunIds.push(currentRunId, activeRunId);
    recordCreatedEmail("active+clerk_test@evoa.fit", activeRunId);
    backdateRegistryFile(activeRunId, MIN_LEFTOVER_AGE_MS + 60_000);
    recordStoreProduct("glute-plan-active", activeRunId);

    // act
    const leftovers = findLeftoverRunIds(currentRunId);
    const possiblyActive = findPossiblyActiveRunIds(currentRunId);

    // assert
    expect(leftovers).not.toContain(activeRunId);
    expect(possiblyActive.filter((runId) => runId === activeRunId)).toEqual([
      activeRunId,
    ]);
  });
});
