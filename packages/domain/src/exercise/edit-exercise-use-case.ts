import type { Clock } from "../shared";
import type { Exercise } from "./exercise";
import {
  ExerciseDraft,
  type ExerciseDraftInput,
  type ExerciseDraftProblems,
} from "./exercise-draft";
import type { ExerciseLibrary } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";

type EditExerciseCommand = {
  exerciseId: string;
  draft: ExerciseDraftInput;
};

export type EditExerciseResult =
  | { status: "edited"; exercise: Exercise }
  | { status: "invalid"; problems: ExerciseDraftProblems }
  | { status: "not-found" }
  | { status: "failed" };

type EditExerciseUseCaseOptions = {
  library: ExerciseLibrary;
  clock: Clock;
  incidents: ExerciseLibraryIncidents;
};

export class EditExerciseUseCase {
  constructor(private readonly options: EditExerciseUseCaseOptions) {}

  async execute(command: EditExerciseCommand): Promise<EditExerciseResult> {
    try {
      return await this.edit(command);
    } catch (error) {
      this.options.incidents.exerciseEditFailed({
        exerciseId: command.exerciseId,
        error,
      });

      return { status: "failed" };
    }
  }

  private async edit({
    exerciseId,
    draft: input,
  }: EditExerciseCommand): Promise<EditExerciseResult> {
    const { library, clock } = this.options;
    const [exercise, exercises] = await Promise.all([
      library.find(exerciseId),
      library.list(),
    ]);

    if (!exercise) return { status: "not-found" };

    const otherNames = exercises
      .filter(({ id }) => id !== exerciseId)
      .map(({ name }) => name);
    const draft = ExerciseDraft.from(input, otherNames);

    if (draft.status === "invalid") return draft;

    const edited = exercise.revised(draft.draft, clock.now());

    if ((await library.replace(edited)) === "name-taken") {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "edited", exercise: edited };
  }
}
