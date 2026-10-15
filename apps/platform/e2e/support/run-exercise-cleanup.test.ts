import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanUpRunExercises, recordCoachAccount } from "./coach-exercises";
import { e2eDirectory } from "./repo-paths";

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
  return `test-exercises-${Date.now().toString(36)}-${Math.floor(Math.random() * 46_656).toString(36)}`;
}

function registryPathFor(runId: string): string {
  return resolve(runtimeDirectory, `coach-accounts-${runId}.log`);
}

describe("cleanUpRunExercises", () => {
  let runId: string;

  beforeEach(() => {
    runId = uniqueRunId();
    issued.queries.length = 0;
    issued.failure = null;
  });

  afterEach(() => {
    if (existsSync(registryPathFor(runId))) {
      rmSync(registryPathFor(runId));
    }
  });

  it("deletes the exercises of every coach account the run recorded and forgets them", async () => {
    // arrange
    recordCoachAccount("user_coach_one", runId);
    recordCoachAccount("user_coach_two", runId);

    // act
    const result = await cleanUpRunExercises(runId, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(issued.queries).toEqual([
      {
        statement: expect.stringMatching(/delete from app\.exercises/),
        values: [["user_coach_one", "user_coach_two"]],
      },
    ]);
    expect(existsSync(registryPathFor(runId))).toBe(false);
  });

  it("touches nothing when the run recorded no coach account", async () => {
    // arrange
    const unrecorded = runId;

    // act
    const result = await cleanUpRunExercises(unrecorded, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(issued.queries).toEqual([]);
  });

  it("keeps the record for the next sweep when the deletion fails", async () => {
    // arrange
    recordCoachAccount("user_coach_one", runId);
    issued.failure = new Error("connection terminated");

    // act
    const result = await cleanUpRunExercises(runId, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: false });
    expect(existsSync(registryPathFor(runId))).toBe(true);
  });
});
