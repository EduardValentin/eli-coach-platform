import type { LibraryExercise } from "./library-exercise";

export interface LibraryExercisesPort {
  listFor(coachAccountId: string): Promise<LibraryExercise[]>;
}
