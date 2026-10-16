export class InvalidStoredExerciseError extends Error {
  constructor(readonly fields: readonly string[]) {
    super(`A stored exercise breaks its rules in ${fields.join(", ")}.`);
    this.name = "InvalidStoredExerciseError";
  }
}
