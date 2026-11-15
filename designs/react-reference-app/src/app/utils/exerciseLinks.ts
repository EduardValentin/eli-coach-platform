const CLIENT_EXERCISES_PATH = '/portal/exercises';

export function clientExercisePath(exerciseId: string): string {
  return `${CLIENT_EXERCISES_PATH}/${encodeURIComponent(exerciseId)}`;
}

export function clientExerciseUrl(exerciseId: string, origin: string): string {
  return new URL(clientExercisePath(exerciseId), origin).href;
}
