import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanUpRunExercises, recordCoachAccount } from "./coach-exercises";
import { e2eDirectory } from "./repo-paths";

const issued = vi.hoisted(() => ({
  queries: [] as { statement: string; values: unknown[] }[],
  failure: null as Error | null,
  deleted: [] as { videoId: string | null }[],
}));

vi.mock("./database", () => ({
  createE2eDatabasePool: () => ({
    query: async (statement: string, values: unknown[]) => {
      if (issued.failure) {
        throw issued.failure;
      }

      issued.queries.push({ statement, values });

      return { rows: issued.deleted, rowCount: issued.deleted.length };
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
  let videoRoot: string;

  beforeEach(() => {
    runId = uniqueRunId();
    issued.queries.length = 0;
    issued.failure = null;
    issued.deleted = [];
    videoRoot = mkdtempSync(join(tmpdir(), "exercise-videos-"));
    vi.stubEnv("EXERCISE_VIDEO_ROOT", videoRoot);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(videoRoot, { force: true, recursive: true });
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

  it("removes the stored video files of the exercises it deletes, and only those", async () => {
    // arrange
    const videos = join(videoRoot, "videos");
    mkdirSync(videos);
    writeFileSync(join(videos, "video-deleted"), "deleted");
    writeFileSync(join(videos, "video-kept"), "kept");
    recordCoachAccount("user_coach_one", runId);
    issued.deleted = [{ videoId: "video-deleted" }, { videoId: null }];

    // act
    const result = await cleanUpRunExercises(runId, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(existsSync(join(videos, "video-deleted"))).toBe(false);
    expect(existsSync(join(videos, "video-kept"))).toBe(true);
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
