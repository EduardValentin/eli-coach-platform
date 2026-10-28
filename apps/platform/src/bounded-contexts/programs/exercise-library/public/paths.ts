import { COACH_PORTAL_PATH } from "../../../access/public/paths";

const EXERCISES_API = "/api/coach/exercises";

const EXERCISE_VIDEOS_API = "/api/exercises";

const EXERCISES_SEGMENT = "exercises";

export const EXERCISE_LIBRARY_API_PATHS = {
  exercises: EXERCISES_API,
  exercise: `${EXERCISES_API}/:exerciseId`,
  exerciseArchive: `${EXERCISES_API}/:exerciseId/archive`,
  exerciseRestore: `${EXERCISES_API}/:exerciseId/restore`,
  exerciseVideo: `${EXERCISE_VIDEOS_API}/:exerciseId/video/:videoId`,
} as const;

export const COACH_TRAINING_ROUTE_SEGMENT = "training";

export const NEW_EXERCISE_ROUTE_SEGMENT = `${COACH_TRAINING_ROUTE_SEGMENT}/${EXERCISES_SEGMENT}/new`;

export const EXERCISE_EDITOR_ROUTE_SEGMENT = `${COACH_TRAINING_ROUTE_SEGMENT}/${EXERCISES_SEGMENT}/:exerciseId`;

export const COACH_TRAINING_PATH = `${COACH_PORTAL_PATH}/${COACH_TRAINING_ROUTE_SEGMENT}`;

export const NEW_EXERCISE_PATH = `${COACH_TRAINING_PATH}/${EXERCISES_SEGMENT}/new`;

export function exerciseEditorPath(exerciseId: string): string {
  return `${COACH_TRAINING_PATH}/${EXERCISES_SEGMENT}/${encodeURIComponent(exerciseId)}`;
}

export function exercisePath(exerciseId: string): string {
  return `${EXERCISES_API}/${encodeURIComponent(exerciseId)}`;
}

export function exerciseArchivePath(exerciseId: string): string {
  return `${exercisePath(exerciseId)}/archive`;
}

export function exerciseRestorePath(exerciseId: string): string {
  return `${exercisePath(exerciseId)}/restore`;
}

export function exerciseVideoPath(exerciseId: string, videoId: string): string {
  return `${EXERCISE_VIDEOS_API}/${encodeURIComponent(exerciseId)}/video/${encodeURIComponent(videoId)}`;
}
