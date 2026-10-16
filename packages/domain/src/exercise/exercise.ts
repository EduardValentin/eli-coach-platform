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

type ExerciseFields = Omit<ExerciseSnapshot, "video">;

export type ExerciseRevision = {
  exercise: Exercise;
  replacedVideo: ExerciseVideo | null;
};

export class Exercise {
  private constructor(
    private readonly fields: ExerciseFields,
    private readonly attachedVideo: ExerciseVideo | null,
  ) {}

  static added(input: AddedExerciseInput): Exercise {
    return new Exercise(
      {
        id: input.id,
        ownerAccountId: input.ownerAccountId,
        ...input.draft.toSnapshot(),
        createdAt: input.at,
        updatedAt: input.at,
      },
      input.video.kind === "attach" ? input.video.video : null,
    );
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
        : draft.draft.fieldsNormalizedFrom(fields)),
    ];

    if (draft.status === "invalid" || broken.length > 0) {
      throw new InvalidStoredExerciseError(broken);
    }

    return new Exercise(
      { id, ownerAccountId, ...draft.draft.toSnapshot(), createdAt, updatedAt },
      video && ExerciseVideo.fromStored(video),
    );
  }

  get id(): string {
    return this.fields.id;
  }

  get name(): string {
    return this.fields.name;
  }

  get video(): ExerciseVideo | null {
    return this.attachedVideo;
  }

  revised(input: ExerciseRevisionInput): ExerciseRevision {
    return {
      exercise: new Exercise(
        { ...this.fields, ...input.draft.toSnapshot(), updatedAt: input.at },
        this.videoAfter(input.video),
      ),
      replacedVideo: input.video.kind === "keep" ? null : this.attachedVideo,
    };
  }

  toSnapshot(): ExerciseSnapshot {
    return {
      ...this.fields,
      primaryMuscles: [...this.fields.primaryMuscles],
      secondaryMuscles: [...this.fields.secondaryMuscles],
      equipment: [...this.fields.equipment],
      tags: [...this.fields.tags],
      video: this.attachedVideo && this.attachedVideo.toSnapshot(),
    };
  }

  private videoAfter(change: ExerciseVideoChange): ExerciseVideo | null {
    switch (change.kind) {
      case "keep":
        return this.attachedVideo;
      case "remove":
        return null;
      case "attach":
        return change.video;
    }
  }
}
