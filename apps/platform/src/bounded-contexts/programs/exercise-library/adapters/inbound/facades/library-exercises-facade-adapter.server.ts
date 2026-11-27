import type {
  LibraryExerciseEntry,
  ListLibraryExercisesUseCase,
} from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type {
  LibraryExercisesFacade,
  LibraryExerciseView,
} from "~/bounded-contexts/programs/exercise-library/public/library-exercises-facade";
import { exerciseVideoPath } from "~/bounded-contexts/programs/exercise-library/public/paths";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type LibraryExercisesFacadeAdapterOptions = {
  listLibraryExercisesUseCase: ListLibraryExercisesUseCase;
  unitOfWork: UnitOfWork;
};

export class LibraryExercisesFacadeAdapter implements LibraryExercisesFacade {
  constructor(private readonly options: LibraryExercisesFacadeAdapterOptions) {}

  async listLibraryExercises(
    coachAccountId: string,
  ): Promise<LibraryExerciseView[]> {
    const exercises = await this.options.unitOfWork(() =>
      this.options.listLibraryExercisesUseCase.execute(coachAccountId),
    );

    return exercises.map((exercise) => this.viewOf(exercise));
  }

  private viewOf(exercise: LibraryExerciseEntry): LibraryExerciseView {
    return {
      exerciseId: exercise.id,
      name: exercise.name,
      type: exercise.type,
      unit: exercise.unit,
      perSide: exercise.perSide,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      pattern: exercise.pattern,
      role: exercise.role,
      tags: exercise.tags,
      cues: exercise.cues,
      videoPath:
        exercise.video &&
        exerciseVideoPath(exercise.id, exercise.video.videoId),
      archived: exercise.status === "archived",
    };
  }
}
