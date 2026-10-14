import type { Clock } from "../shared";
import { Exercise } from "./exercise";
import {
  ExerciseDraft,
  type ExerciseDraftInput,
  type ExerciseDraftProblems,
} from "./exercise-draft";
import type { ExerciseIds } from "./exercise-ids";
import type { ExerciseLibrary } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";

export type CreateExerciseResult =
  | { status: "created"; exercise: Exercise }
  | { status: "invalid"; problems: ExerciseDraftProblems }
  | { status: "failed" };

type CreateExerciseUseCaseOptions = {
  library: ExerciseLibrary;
  ids: ExerciseIds;
  clock: Clock;
  incidents: ExerciseLibraryIncidents;
};

export class CreateExerciseUseCase {
  constructor(private readonly options: CreateExerciseUseCaseOptions) {}

  async execute(input: ExerciseDraftInput): Promise<CreateExerciseResult> {
    try {
      return await this.create(input);
    } catch (error) {
      this.options.incidents.exerciseCreationFailed({ error });

      return { status: "failed" };
    }
  }

  private async create(
    input: ExerciseDraftInput,
  ): Promise<CreateExerciseResult> {
    const { library, ids, clock } = this.options;
    const otherNames = (await library.list()).map(({ name }) => name);
    const draft = ExerciseDraft.from(input, otherNames);

    if (draft.status === "invalid") return draft;

    const exercise = Exercise.added({
      id: ids.generate(),
      draft: draft.draft,
      at: clock.now(),
    });

    if ((await library.add(exercise)) === "name-taken") {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "created", exercise };
  }
}
