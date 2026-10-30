import { describe, expect, it, vi } from "vitest";

import { CreateExerciseUseCase } from "./create-exercise-use-case";
import { Exercise, type ExerciseSnapshot } from "./exercise";
import type { ExerciseDraftInput } from "./exercise-draft";
import type {
  ExerciseAddition,
  ExerciseLibraryPort,
} from "./exercise-library-port";
import type { ExerciseLibraryIncidentsPort } from "./exercise-library-incidents-port";
import type { ExerciseVideoFormatDetectorPort } from "./exercise-video-format-detector-port";
import { MAX_EXERCISE_VIDEO_BYTES } from "./exercise-video";
import type {
  ExerciseVideoStorePort,
  StagedExerciseVideo,
} from "./exercise-video-store-port";

const STORED_AT = new Date("2026-10-13T09:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";

const HIP_THRUST = Exercise.reconstitute({
  id: "e0000000-0000-4000-8000-000000000001",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  tags: [],
  cues: "",
  video: null,
  archivedAt: null,
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
});

const OTHER_COACHS_PLANK = Exercise.reconstitute({
  ...HIP_THRUST.toSnapshot(),
  id: "e0000000-0000-4000-8000-000000000003",
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
  name: "Plank",
});

const ARCHIVED_LUNGE = Exercise.reconstitute({
  ...HIP_THRUST.toSnapshot(),
  id: "e0000000-0000-4000-8000-000000000004",
  name: "Lunge",
  archivedAt: NOW,
});

const SQUAT: ExerciseDraftInput = {
  name: "  Back squat ",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell", "Squat rack"],
  difficulty: "Intermediate",
  tags: ["Strength"],
  cues: "Brace.",
};

const CREATED_SQUAT: ExerciseSnapshot = {
  ...SQUAT,
  id: "e0000000-0000-4000-8000-000000000002",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell", "Squat rack"],
  difficulty: "Intermediate",
  tags: ["Strength"],
  video: null,
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const STAGED: StagedExerciseVideo = {
  stagingId: "staging-1",
  sizeBytes: 2_048,
  leadingBytes: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]),
};

const ATTACH = { kind: "attach", staged: STAGED } as const;

function createUseCase() {
  const stored = [HIP_THRUST, ARCHIVED_LUNGE, OTHER_COACHS_PLANK];
  const library = {
    list: vi.fn(async (ownerAccountId: string): Promise<Exercise[]> =>
      stored.filter(
        (exercise) => exercise.toSnapshot().ownerAccountId === ownerAccountId,
      ),
    ),
    find: vi.fn(),
    add: vi.fn(async (): Promise<ExerciseAddition> => "added"),
    replace: vi.fn(),
    remove: vi.fn(),
  } satisfies ExerciseLibraryPort;
  const incidents = {
    exerciseCreationFailed: vi.fn(),
    exerciseEditFailed: vi.fn(),
    exerciseRestoreFailed: vi.fn(),
    videoCleanupFailed: vi.fn(),
  } satisfies ExerciseLibraryIncidentsPort;
  const formats = {
    detect: vi.fn(async (): Promise<string | null> => "mp4"),
  } satisfies ExerciseVideoFormatDetectorPort;
  const store = {
    keep: vi.fn(async () => undefined),
    discard: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  } satisfies Pick<ExerciseVideoStorePort, "keep" | "discard" | "remove">;
  const useCase = new CreateExerciseUseCase({
    library,
    ids: { generate: () => "e0000000-0000-4000-8000-000000000002" },
    videoIds: { generate: () => "9c1b0000-0000-4000-8000-000000000001" },
    clock: { now: () => NOW },
    incidents,
    formats,
    store,
  });

  return { useCase, library, incidents, formats, store };
}

describe("CreateExerciseUseCase", () => {
  it("adds the exercise without a video under a new id, owned by the coach who created it, its name trimmed, created now", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: { kind: "keep" },
    });

    // assert
    const created = Exercise.reconstitute(CREATED_SQUAT);
    expect(result).toEqual({ status: "created", exercise: created });
    expect(library.add).toHaveBeenCalledWith(created);
    expect(store.keep).not.toHaveBeenCalled();
  });

  it("keeps an accepted video under a video id it hands out and adds the exercise with it", async () => {
    // arrange
    const { useCase, library, formats, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: ATTACH,
    });

    // assert
    const created = Exercise.reconstitute({
      ...CREATED_SQUAT,
      video: {
        videoId: "9c1b0000-0000-4000-8000-000000000001",
        format: "mp4",
        sizeBytes: 2_048,
      },
    });
    expect(result).toEqual({ status: "created", exercise: created });
    expect(formats.detect).toHaveBeenCalledWith(STAGED.leadingBytes);
    expect(store.keep).toHaveBeenCalledWith(
      "staging-1",
      "9c1b0000-0000-4000-8000-000000000001",
    );
    expect(library.add).toHaveBeenCalledWith(created);
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("refuses content that is not an .mp4 or .mov video and discards it without adding the exercise", async () => {
    // arrange
    const { useCase, library, formats, store } = createUseCase();
    formats.detect.mockResolvedValueOnce(null);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { video: "unsupported" },
    });
    expect(store.discard).toHaveBeenCalledWith("staging-1");
    expect(store.keep).not.toHaveBeenCalled();
    expect(library.add).not.toHaveBeenCalled();
  });

  it("reports a refused upload it could not discard by its staging id and still answers the refusal", async () => {
    // arrange
    const failure = new Error("disk unavailable");
    const { useCase, formats, incidents, store } = createUseCase();
    formats.detect.mockResolvedValueOnce(null);
    store.discard.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { video: "unsupported" },
    });
    expect(incidents.videoCleanupFailed).toHaveBeenCalledExactlyOnceWith({
      stagingId: "staging-1",
      error: failure,
    });
  });

  it("refuses a video over 50 MB and discards it", async () => {
    // arrange
    const { useCase, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: {
        kind: "attach",
        staged: { ...STAGED, sizeBytes: MAX_EXERCISE_VIDEO_BYTES + 1 },
      },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { video: "too-large" },
    });
    expect(store.discard).toHaveBeenCalledWith("staging-1");
  });

  it("names every problem of a draft that breaks a rule beside a refused video", async () => {
    // arrange
    const { useCase, formats, library } = createUseCase();
    formats.detect.mockResolvedValueOnce("pdf");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: " ", primaryMuscles: [] },
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: {
        name: "missing",
        primaryMuscles: "missing",
        video: "unsupported",
      },
    });
    expect(library.add).not.toHaveBeenCalled();
  });

  it("discards an accepted video when the draft breaks a rule", async () => {
    // arrange
    const { useCase, store, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: " HIP thrust  " },
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(store.discard).toHaveBeenCalledWith("staging-1");
    expect(store.keep).not.toHaveBeenCalled();
    expect(library.add).not.toHaveBeenCalled();
  });

  it("removes the kept video when the library finds the name taken by an exercise added meanwhile", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();
    library.add.mockResolvedValueOnce("name-taken");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(store.remove).toHaveBeenCalledWith(
      "9c1b0000-0000-4000-8000-000000000001",
    );
  });

  it("removes the kept video, reports the failed write and answers that the creation failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents, store } = createUseCase();
    library.add.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(store.remove).toHaveBeenCalledWith(
      "9c1b0000-0000-4000-8000-000000000001",
    );
    expect(incidents.exerciseCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });

  it("discards the staged video, reports a failed read of the other names and answers that the creation failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents, store } = createUseCase();
    library.list.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(library.add).not.toHaveBeenCalled();
    expect(store.discard).toHaveBeenCalledWith("staging-1");
    expect(incidents.exerciseCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });

  it("reports a video it could not remove and still answers the name taken", async () => {
    // arrange
    const failure = new Error("disk unavailable");
    const { useCase, library, incidents, store } = createUseCase();
    library.add.mockResolvedValueOnce("name-taken");
    store.remove.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(incidents.videoCleanupFailed).toHaveBeenCalledWith({
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      error: failure,
    });
  });

  it("refuses a name another of her exercises already has, whatever its case and spaces, without adding it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: " HIP thrust  " },
      video: { kind: "keep" },
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(library.add).not.toHaveBeenCalled();
  });

  it("adds a name only another coach's exercise has", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: "plank" },
      video: { kind: "keep" },
    });

    // assert
    expect(result.status).toBe("created");
    expect(library.add).toHaveBeenCalledOnce();
  });

  it("adds a name only an archived exercise of hers has", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: " lunge" },
      video: { kind: "keep" },
    });

    // assert
    expect(result.status).toBe("created");
    expect(library.add).toHaveBeenCalledOnce();
  });

  it("reports a failed write and answers that the creation failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents, store } = createUseCase();
    library.add.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
      video: { kind: "keep" },
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(store.remove).not.toHaveBeenCalled();
    expect(incidents.exerciseCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });

  it("names a taken name beside the draft's other problems", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: " hip thrust", primaryMuscles: [] },
      video: { kind: "keep" },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { name: "taken", primaryMuscles: "missing" },
    });
    expect(library.add).not.toHaveBeenCalled();
  });
});
