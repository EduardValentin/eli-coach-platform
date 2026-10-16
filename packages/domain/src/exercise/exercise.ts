import {
  ExerciseDraft,
  type ExerciseDraftInput,
  type ExerciseDraftProblems,
  type ExerciseDraftSnapshot,
} from "./exercise-draft";
import { isUuid } from "./exercise-ids";
import {
  ExerciseVideo,
  type ExerciseVideoSnapshot,
  type StoredExerciseVideo,
} from "./exercise-video";
import type { ExerciseVideoRefusal } from "./exercise-video-upload";
import { InvalidStoredExerciseError } from "./invalid-stored-exercise-error";

export type ExerciseSnapshot = ExerciseDraftSnapshot & {
  id: string;
  ownerAccountId: string;
  video: ExerciseVideoSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredExercise = ExerciseDraftInput & {
  id: string;
  ownerAccountId: string;
  video: StoredExerciseVideo | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExerciseSaveProblems = Omit<ExerciseDraftProblems, "name"> & {
  name?: ExerciseDraftProblems["name"] | "taken";
  video?: ExerciseVideoRefusal;
};

export type ExerciseVideoChange =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "attach"; video: ExerciseVideo };

type AddedExerciseInput = {
  id: string;
  ownerAccountId: string;
  draft: ExerciseDraft;
  at: Date;
  video: ExerciseVideoChange;
};

type ExerciseRevisionInput = {
  draft: ExerciseDraft;
  at: Date;
  video: ExerciseVideoChange;
};

export type ExerciseRevision = {
  exercise: Exercise;
  replacedVideo: ExerciseVideo | null;
};

export class Exercise {
  private constructor(private readonly snapshot: ExerciseSnapshot) {}

  static added(input: AddedExerciseInput): Exercise {
    return new Exercise({
      id: input.id,
      ownerAccountId: input.ownerAccountId,
      ...input.draft.toSnapshot(),
      video:
        input.video.kind === "attach" ? input.video.video.toSnapshot() : null,
      createdAt: input.at,
      updatedAt: input.at,
    });
  }

  static reconstitute(stored: StoredExercise): Exercise {
    const { id, ownerAccountId, video, createdAt, updatedAt, ...fields } =
      stored;
    const draft = ExerciseDraft.from(fields);
    const broken = [
      ...(isUuid(id) ? [] : ["id"]),
      ...(isUuid(ownerAccountId) ? [] : ["ownerAccountId"]),
      ...(draft.status === "invalid"
        ? Object.keys(draft.problems)
        : draft.draft.fieldsChangedFrom(fields)),
    ];

    if (draft.status === "invalid" || broken.length > 0) {
      throw new InvalidStoredExerciseError(broken);
    }

    return new Exercise({
      id,
      ownerAccountId,
      ...draft.draft.toSnapshot(),
      video: video && ExerciseVideo.fromStored(video).toSnapshot(),
      createdAt,
      updatedAt,
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get name(): string {
    return this.snapshot.name;
  }

  get video(): ExerciseVideo | null {
    return this.snapshot.video && ExerciseVideo.fromStored(this.snapshot.video);
  }

  revised(input: ExerciseRevisionInput): ExerciseRevision {
    return {
      exercise: new Exercise({
        ...this.snapshot,
        ...input.draft.toSnapshot(),
        video: this.videoAfter(input.video),
        updatedAt: input.at,
      }),
      replacedVideo: input.video.kind === "keep" ? null : this.video,
    };
  }

  toSnapshot(): ExerciseSnapshot {
    return {
      ...this.snapshot,
      primaryMuscles: [...this.snapshot.primaryMuscles],
      secondaryMuscles: [...this.snapshot.secondaryMuscles],
      equipment: [...this.snapshot.equipment],
      tags: [...this.snapshot.tags],
      video: this.snapshot.video && { ...this.snapshot.video },
    };
  }

  private videoAfter(
    change: ExerciseVideoChange,
  ): ExerciseVideoSnapshot | null {
    switch (change.kind) {
      case "keep":
        return this.snapshot.video;
      case "remove":
        return null;
      case "attach":
        return change.video.toSnapshot();
    }
  }
}
