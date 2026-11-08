import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { e2eDirectory } from "./repo-paths";
import { cleanUpRunStoreProducts, recordStoreProduct } from "./store-products";

const issued = vi.hoisted(() => ({
  queries: [] as { statement: string; values: unknown[] }[],
  failure: null as Error | null,
}));

vi.mock("./database", () => ({
  createE2eDatabasePool: () => ({
    query: async (statement: string, values: unknown[]) => {
      if (issued.failure) {
        throw issued.failure;
      }

      issued.queries.push({ statement, values });

      return { rows: [], rowCount: 2 };
    },
    end: async () => undefined,
  }),
}));

const runtimeDirectory = resolve(e2eDirectory, ".runtime");

function uniqueRunId(): string {
  return `test-store-${Date.now().toString(36)}-${Math.floor(Math.random() * 46_656).toString(36)}`;
}

function registryPathFor(runId: string): string {
  return resolve(runtimeDirectory, `store-products-${runId}.log`);
}

function loggedLines(log: MockInstance): string[] {
  return log.mock.calls.map(([line]) => String(line));
}

describe("cleanUpRunStoreProducts", () => {
  let runId: string;
  let log: MockInstance;

  beforeEach(() => {
    runId = uniqueRunId();
    issued.queries.length = 0;
    issued.failure = null;
    log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    if (existsSync(registryPathFor(runId))) {
      rmSync(registryPathFor(runId));
    }
  });

  it("retires every store product the run published and forgets them", async () => {
    // arrange
    recordStoreProduct("glute-plan-run", runId);
    recordStoreProduct("mobility-guide-run", runId);

    // act
    const result = await cleanUpRunStoreProducts(runId, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(issued.queries).toEqual([
      {
        statement: expect.stringMatching(
          /update app\.products\s+set lifecycle_status = 'archived'/,
        ),
        values: [["glute-plan-run", "mobility-guide-run"]],
      },
    ]);
    expect(loggedLines(log)).toContain("[test] Store products: retired 2");
    expect(existsSync(registryPathFor(runId))).toBe(false);
  });

  it("touches nothing when the run published no store product", async () => {
    // arrange
    const unrecorded = runId;

    // act
    const result = await cleanUpRunStoreProducts(unrecorded, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(issued.queries).toEqual([]);
  });

  it("keeps the record for the next sweep when the retirement fails", async () => {
    // arrange
    recordStoreProduct("glute-plan-run", runId);
    issued.failure = new Error("connection terminated");

    // act
    const result = await cleanUpRunStoreProducts(runId, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: false });
    expect(existsSync(registryPathFor(runId))).toBe(true);
  });
});
