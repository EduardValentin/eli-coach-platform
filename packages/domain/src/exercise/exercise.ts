import type {
  ExerciseDraft,
  ExerciseDraftProblems,
  ExerciseDraftSnapshot,
} from "./exercise-draft";
import {
  ExerciseVideo,
  type ExerciseVideoRefusal,
  type ExerciseVideoSnapshot,
} from "./exercise-video";

export type ExerciseSnapshot = ExerciseDraftSnapshot & {
  id: string;
  ownerAccountId: string;
  video: ExerciseVideoSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExerciseSaveProblems = ExerciseDraftProblems & {
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

  static reconstitute(snapshot: ExerciseSnapshot): Exercise {
    return new Exercise(new Exercise(snapshot).toSnapshot());
  }

  get id(): string {
    return this.snapshot.id;
  }

  get name(): string {
    return this.snapshot.name;
  }

  get video(): ExerciseVideo | null {
    return this.snapshot.video && ExerciseVideo.of(this.snapshot.video);
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
