import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { cleanUpRunExercises, recordCoachAccount } from "./coach-exercises";
import { e2eDirectory } from "./repo-paths";

const issued = vi.hoisted(() => ({
  queries: [] as { statement: string; values: unknown[] }[],
  failure: null as Error | null,
  videoIds: [] as string[],
  filesAtDeletion: [] as string[],
  videoFolder: "",
}));

vi.mock("./database", async () => {
  const { existsSync: exists, readdirSync } = await import("node:fs");

  return {
    createE2eDatabasePool: () => ({
      query: async (statement: string, values: unknown[]) => {
        if (issued.failure) {
          throw issued.failure;
        }

        issued.queries.push({ statement, values });

        if (/^\s*select/.test(statement)) {
          return {
            rows: issued.videoIds.map((videoId) => ({ videoId })),
            rowCount: issued.videoIds.length,
          };
        }

        issued.filesAtDeletion = exists(issued.videoFolder)
          ? readdirSync(issued.videoFolder)
          : [];

        return { rows: [], rowCount: 2 };
      },
      end: async () => undefined,
    }),
  };
});

const runtimeDirectory = resolve(e2eDirectory, ".runtime");

function uniqueRunId(): string {
  return `test-exercises-${Date.now().toString(36)}-${Math.floor(Math.random() * 46_656).toString(36)}`;
}

function registryPathFor(runId: string): string {
  return resolve(runtimeDirectory, `coach-accounts-${runId}.log`);
}

function loggedLines(log: MockInstance): string[] {
  return log.mock.calls.map(([line]) => String(line));
}

describe("cleanUpRunExercises", () => {
  let runId: string;
  let videoRoot: string;
  let videos: string;
  let log: MockInstance;

  beforeEach(() => {
    runId = uniqueRunId();
    videoRoot = mkdtempSync(join(tmpdir(), "exercise-videos-"));
    videos = join(videoRoot, "videos");
    mkdirSync(videos);
    issued.queries.length = 0;
    issued.failure = null;
    issued.videoIds = [];
    issued.filesAtDeletion = [];
    issued.videoFolder = videos;
    vi.stubEnv("EXERCISE_VIDEO_ROOT", videoRoot);
    log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
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
        statement: expect.stringMatching(/select video_file_id/),
        values: [["user_coach_one", "user_coach_two"]],
      },
      {
        statement: expect.stringMatching(/delete from app\.exercises/),
        values: [["user_coach_one", "user_coach_two"]],
      },
    ]);
    expect(existsSync(registryPathFor(runId))).toBe(false);
  });

  it("removes the run's video files before it deletes their exercises, and only those", async () => {
    // arrange
    writeFileSync(join(videos, "video-of-the-run"), "run");
    writeFileSync(join(videos, "video-kept"), "kept");
    recordCoachAccount("user_coach_one", runId);
    issued.videoIds = ["video-of-the-run"];

    // act
    const result = await cleanUpRunExercises(runId, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(issued.filesAtDeletion).toEqual(["video-kept"]);
    expect(existsSync(join(videos, "video-kept"))).toBe(true);
  });

  it("reports only the video files it actually removed", async () => {
    // arrange
    writeFileSync(join(videos, "video-stored"), "stored");
    recordCoachAccount("user_coach_one", runId);
    issued.videoIds = ["video-stored", "video-already-gone"];

    // act
    await cleanUpRunExercises(runId, "[test]");

    // assert
    expect(loggedLines(log)).toContain("[test] Exercise videos: removed 1");
  });

  it("says it skipped the video files when no video root is set, and still deletes the exercises", async () => {
    // arrange
    vi.stubEnv("EXERCISE_VIDEO_ROOT", "");
    recordCoachAccount("user_coach_one", runId);
    issued.videoIds = ["video-of-the-run"];

    // act
    const result = await cleanUpRunExercises(runId, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(loggedLines(log)).toContain(
      "[test] Exercise videos: skipped, EXERCISE_VIDEO_ROOT is not set",
    );
    expect(issued.queries.map(({ statement }) => statement)).toEqual([
      expect.stringMatching(/select video_file_id/),
      expect.stringMatching(/delete from app\.exercises/),
    ]);
  });

  it("keeps the exercises and the record for a rerun when a video file cannot be removed", async () => {
    // arrange
    mkdirSync(join(videos, "video-unremovable"));
    writeFileSync(join(videos, "video-unremovable", "part"), "part");
    recordCoachAccount("user_coach_one", runId);
    issued.videoIds = ["video-unremovable"];

    // act
    const result = await cleanUpRunExercises(runId, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: false });
    expect(issued.queries.map(({ statement }) => statement)).toEqual([
      expect.stringMatching(/select video_file_id/),
    ]);
    expect(existsSync(registryPathFor(runId))).toBe(true);
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
