import { describe, expect, it, vi } from "vitest";

import { EditExerciseUseCase } from "./edit-exercise-use-case";
import { Exercise, type ExerciseSnapshot } from "./exercise";
import type { ExerciseDraftInput } from "./exercise-draft";
import type {
  ExerciseLibraryPort,
  ExerciseReference,
  ExerciseReplacement,
} from "./exercise-library-port";
import type { ExerciseLibraryIncidentsPort } from "./exercise-library-incidents-port";
import type { ExerciseVideoFormatDetectorPort } from "./exercise-video-format-detector-port";
import type {
  ExerciseVideoStorePort,
  StagedExerciseVideo,
} from "./exercise-video-store-port";

const CREATED_AT = new Date("2026-10-13T09:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";

const STORED_SQUAT: ExerciseSnapshot = {
  id: "e0000000-0000-4000-8000-000000000001",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  tags: [],
  cues: "",
  video: {
    videoId: "9c1b0000-0000-4000-8000-000000000001",
    format: "mp4",
    sizeBytes: 2_048,
  },
  archivedAt: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const HIP_THRUST = Exercise.reconstitute({
  ...STORED_SQUAT,
  id: "e0000000-0000-4000-8000-000000000002",
  name: "Hip thrust",
  primaryMuscles: ["Glutes"],
});

const OTHER_COACHS_PLANK = Exercise.reconstitute({
  ...STORED_SQUAT,
  id: "e0000000-0000-4000-8000-000000000003",
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
  name: "Plank",
});

const ARCHIVED_LUNGE = Exercise.reconstitute({
  ...STORED_SQUAT,
  id: "e0000000-0000-4000-8000-000000000004",
  name: "Lunge",
  video: null,
  archivedAt: CREATED_AT,
});

const SQUAT_REVISED: ExerciseDraftInput = {
  name: " Front squat ",
  type: "mobility",
  unit: "time",
  perSide: true,
  primaryMuscles: ["Quadriceps", "Core"],
  secondaryMuscles: ["Glutes"],
  equipment: [],
  difficulty: "Advanced",
  tags: ["Strength", "Recovery"],
  cues: "Elbows high.",
};

const EDITED_SQUAT: ExerciseSnapshot = {
  id: "e0000000-0000-4000-8000-000000000001",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Front squat",
  type: "mobility",
  unit: "time",
  perSide: true,
  primaryMuscles: ["Quadriceps", "Core"],
  secondaryMuscles: ["Glutes"],
  equipment: [],
  difficulty: "Advanced",
  tags: ["Strength", "Recovery"],
  cues: "Elbows high.",
  video: {
    videoId: "9c1b0000-0000-4000-8000-000000000001",
    format: "mp4",
    sizeBytes: 2_048,
  },
  archivedAt: null,
  createdAt: CREATED_AT,
  updatedAt: NOW,
};

const STAGED: StagedExerciseVideo = {
  stagingId: "staging-2",
  sizeBytes: 4_096,
  leadingBytes: new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112]),
};

const KEEP = { kind: "keep" } as const;
const ATTACH = { kind: "attach", staged: STAGED } as const;

function createUseCase() {
  const stored = [
    Exercise.reconstitute(STORED_SQUAT),
    HIP_THRUST,
    ARCHIVED_LUNGE,
    OTHER_COACHS_PLANK,
  ];
  const ownedBy = (ownerAccountId: string) =>
    stored.filter(
      (exercise) => exercise.toSnapshot().ownerAccountId === ownerAccountId,
    );
  const library = {
    list: vi.fn(async (ownerAccountId: string): Promise<Exercise[]> =>
      ownedBy(ownerAccountId),
    ),
    find: vi.fn(
      async ({
        ownerAccountId,
        exerciseId,
      }: ExerciseReference): Promise<Exercise | null> =>
        ownedBy(ownerAccountId).find(({ id }) => id === exerciseId) ?? null,
    ),
    add: vi.fn(),
    replace: vi.fn(async (): Promise<ExerciseReplacement> => "replaced"),
    remove: vi.fn(),
  } satisfies ExerciseLibraryPort;
  const incidents = {
    exerciseCreationFailed: vi.fn(),
    exerciseEditFailed: vi.fn(),
    exerciseRestoreFailed: vi.fn(),
    videoCleanupFailed: vi.fn(),
  } satisfies ExerciseLibraryIncidentsPort;
  const formats = {
    detect: vi.fn(async (): Promise<string | null> => "mov"),
  } satisfies ExerciseVideoFormatDetectorPort;
  const store = {
    keep: vi.fn(async () => undefined),
    discard: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  } satisfies Pick<ExerciseVideoStorePort, "keep" | "discard" | "remove">;
  const useCase = new EditExerciseUseCase({
    library,
    videoIds: { generate: () => "9c1b0000-0000-4000-8000-000000000002" },
    clock: { now: () => NOW },
    incidents,
    formats,
    store,
  });

  return { useCase, library, incidents, formats, store };
}

describe("EditExerciseUseCase", () => {
  it("replaces the whole exercise, its name trimmed, keeping its id, its owner and the moment it was created", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: KEEP,
    });

    // assert
    const edited = Exercise.reconstitute(EDITED_SQUAT);
    expect(result).toEqual({ status: "edited", exercise: edited });
    expect(library.replace).toHaveBeenCalledWith(edited);
  });

  it("keeps its own name, whatever its case and spaces", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: { ...SQUAT_REVISED, name: " back SQUAT " },
      video: KEEP,
    });

    // assert
    expect(result.status).toBe("edited");
    expect(library.replace).toHaveBeenCalledOnce();
  });

  it("refuses a rename onto the name of another of her exercises without replacing it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: { ...SQUAT_REVISED, name: "hip THRUST" },
      video: KEEP,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("renames onto a name only another coach's exercise has", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: { ...SQUAT_REVISED, name: "plank" },
      video: KEEP,
    });

    // assert
    expect(result.status).toBe("edited");
    expect(library.replace).toHaveBeenCalledOnce();
  });

  it("renames onto a name only an archived exercise of hers has", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: { ...SQUAT_REVISED, name: "LUNGE " },
      video: KEEP,
    });

    // assert
    expect(result.status).toBe("edited");
    expect(library.replace).toHaveBeenCalledOnce();
  });

  it("refuses to edit an archived exercise, discarding the staged video without replacing it", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000004",
      draft: SQUAT_REVISED,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "archived" });
    expect(store.discard).toHaveBeenCalledWith("staging-2");
    expect(store.keep).not.toHaveBeenCalled();
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("refuses a draft that breaks a rule without replacing it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: { ...SQUAT_REVISED, type: "stretching", unit: "reps" },
      video: KEEP,
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { unit: "not-allowed" },
    });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("refuses the name when the library finds it taken by an exercise renamed meanwhile", async () => {
    // arrange
    const { useCase, library } = createUseCase();
    library.replace.mockResolvedValueOnce("name-taken");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: KEEP,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
  });

  it("finds nothing to edit for an unknown exercise", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000404",
      draft: SQUAT_REVISED,
      video: KEEP,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("finds nothing to edit in another coach's library", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: OTHER_COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: KEEP,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("reports a failed read and answers that the edit failed without replacing it", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents } = createUseCase();
    library.find.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: KEEP,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(library.replace).not.toHaveBeenCalled();
    expect(incidents.exerciseEditFailed).toHaveBeenCalledWith({
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      error: failure,
    });
  });

  it("reports a failed write and answers that the edit failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents } = createUseCase();
    library.replace.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: KEEP,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.exerciseEditFailed).toHaveBeenCalledWith({
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      error: failure,
    });
  });

  it("replaces the video with an accepted new one and removes the replaced file once the edit is written", async () => {
    // arrange
    const { useCase, library, formats, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: ATTACH,
    });

    // assert
    const edited = Exercise.reconstitute({
      ...EDITED_SQUAT,
      video: {
        videoId: "9c1b0000-0000-4000-8000-000000000002",
        format: "mov",
        sizeBytes: 4_096,
      },
    });
    expect(result).toEqual({ status: "edited", exercise: edited });
    expect(formats.detect).toHaveBeenCalledWith(STAGED.leadingBytes);
    expect(store.keep).toHaveBeenCalledWith(
      "staging-2",
      "9c1b0000-0000-4000-8000-000000000002",
    );
    expect(library.replace).toHaveBeenCalledWith(edited);
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(
      "9c1b0000-0000-4000-8000-000000000001",
    );
    expect(library.replace.mock.invocationCallOrder[0]).toBeLessThan(
      store.remove.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("removes the video and deletes its file once the edit is written", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: { kind: "remove" },
    });

    // assert
    const edited = Exercise.reconstitute({ ...EDITED_SQUAT, video: null });
    expect(result).toEqual({ status: "edited", exercise: edited });
    expect(library.replace).toHaveBeenCalledWith(edited);
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(
      "9c1b0000-0000-4000-8000-000000000001",
    );
  });

  it("reports a replaced file it could not delete and still answers the exercise edited", async () => {
    // arrange
    const failure = new Error("disk unavailable");
    const { useCase, incidents, store } = createUseCase();
    store.remove.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: { kind: "remove" },
    });

    // assert
    expect(result.status).toBe("edited");
    expect(incidents.videoCleanupFailed).toHaveBeenCalledWith({
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      error: failure,
    });
  });

  it("refuses content that is not an .mp4 or .mov video, discards it and keeps the current video", async () => {
    // arrange
    const { useCase, library, formats, store } = createUseCase();
    formats.detect.mockResolvedValueOnce(null);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { video: "unsupported" },
    });
    expect(store.discard).toHaveBeenCalledWith("staging-2");
    expect(store.remove).not.toHaveBeenCalled();
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("removes the new file and keeps the current one when the library finds the name taken", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();
    library.replace.mockResolvedValueOnce("name-taken");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(
      "9c1b0000-0000-4000-8000-000000000002",
    );
  });

  it("removes the new file, keeps the current one and answers failed when the write throws", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents, store } = createUseCase();
    library.replace.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(
      "9c1b0000-0000-4000-8000-000000000002",
    );
    expect(incidents.exerciseEditFailed).toHaveBeenCalledWith({
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      error: failure,
    });
  });

  it("discards the staged video when there is no exercise to edit", async () => {
    // arrange
    const { useCase, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000404",
      draft: SQUAT_REVISED,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.discard).toHaveBeenCalledWith("staging-2");
    expect(store.keep).not.toHaveBeenCalled();
  });

  it("discards the staged video when the read fails", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, store } = createUseCase();
    library.list.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: SQUAT_REVISED,
      video: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(store.discard).toHaveBeenCalledWith("staging-2");
  });

  it("names a taken name beside the draft's other problems", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      draft: { ...SQUAT_REVISED, name: " hip thrust", primaryMuscles: [] },
      video: KEEP,
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { name: "taken", primaryMuscles: "missing" },
    });
    expect(library.replace).not.toHaveBeenCalled();
  });
});
