import type { ExerciseDraft, ExerciseDraftSnapshot } from "./exercise-draft";

export type ExerciseSnapshot = ExerciseDraftSnapshot & {
  id: string;
  ownerAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

type AddedExerciseInput = {
  id: string;
  ownerAccountId: string;
  draft: ExerciseDraft;
  at: Date;
};

export class Exercise {
  private constructor(private readonly snapshot: ExerciseSnapshot) {}

  static added(input: AddedExerciseInput): Exercise {
    return new Exercise({
      id: input.id,
      ownerAccountId: input.ownerAccountId,
      ...input.draft.toSnapshot(),
      createdAt: input.at,
      updatedAt: input.at,
    });
  }

  static reconstitute(snapshot: ExerciseSnapshot): Exercise {
    return new Exercise({
      ...snapshot,
      primaryMuscles: [...snapshot.primaryMuscles],
      secondaryMuscles: [...snapshot.secondaryMuscles],
      equipment: [...snapshot.equipment],
      tags: [...snapshot.tags],
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get name(): string {
    return this.snapshot.name;
  }

  revised(draft: ExerciseDraft, at: Date): Exercise {
    return new Exercise({
      ...this.snapshot,
      ...draft.toSnapshot(),
      updatedAt: at,
    });
  }

  toSnapshot(): ExerciseSnapshot {
    return {
      ...this.snapshot,
      primaryMuscles: [...this.snapshot.primaryMuscles],
      secondaryMuscles: [...this.snapshot.secondaryMuscles],
      equipment: [...this.snapshot.equipment],
      tags: [...this.snapshot.tags],
    };
  }
}
