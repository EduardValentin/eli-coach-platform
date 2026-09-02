export {
  ExerciseLibraryService,
  type ExerciseIssue,
  type ExerciseVideoInput,
  type ExerciseVideoResult,
  type GetExerciseResult,
  type ListExercisesResult,
  type SaveExerciseCommand,
  type SaveExerciseResult,
} from "./exercise-library-service";
export type { Exercise, ExerciseDraft, ExerciseVideo } from "./exercise-model";
export type {
  ExerciseRepository,
  PersistExerciseCommand,
} from "./exercise-repository";
export {
  buildExerciseVideoAssetKey,
  EXERCISE_VIDEO_MIME_TYPE,
  hasExerciseVideoExtension,
  MAX_EXERCISE_VIDEO_BYTES,
  resolveExerciseVideoFormat,
  type ExerciseVideoFormatResolution,
} from "./exercise-video-format";
export type { ExerciseVideoStore } from "./exercise-video-store";
export {
  areMuscleSelectionsDisjoint,
  BODYWEIGHT_EQUIPMENT,
  EQUIPMENT_OPTIONS,
  EXERCISE_DESCRIPTION_MAX_LENGTH,
  EXERCISE_DIFFICULTIES,
  EXERCISE_NAME_MAX_LENGTH,
  EXERCISE_TAGS,
  MUSCLE_GROUPS,
  requiresEquipment,
  type Equipment,
  type ExerciseDifficulty,
  type ExerciseTag,
  type MuscleGroup,
} from "./exercise-vocabulary";
