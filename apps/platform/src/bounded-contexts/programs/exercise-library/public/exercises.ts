import type {
  Exercise,
  ExerciseDraftInput,
  ExerciseSaveProblems,
  ExerciseSnapshot,
  ExerciseStatus,
  ExerciseVideoFormat,
} from "@eli-coach-platform/domain/exercise";
import { z } from "zod";

import { exerciseVideoPath } from "./paths";

type ExerciseVideoView = { path: string; format: ExerciseVideoFormat };

export type ExerciseView = Omit<
  ExerciseSnapshot,
  "ownerAccountId" | "archivedAt" | "createdAt" | "updatedAt" | "video"
> & { video: ExerciseVideoView | null; status: ExerciseStatus };

export type ExerciseLibraryView = { exercises: ExerciseView[] };

export type ExerciseEditorView = {
  exercise: ExerciseView | null;
  otherNames: string[];
};

export const exerciseRequestSchema = z.object({
  name: z.string(),
  type: z.string(),
  unit: z.string(),
  perSide: z.boolean(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  equipment: z.array(z.string()),
  difficulty: z.string(),
  tags: z.array(z.string()),
  cues: z.string(),
  video: z.enum(["keep", "remove", "attach"]).default("keep"),
}) satisfies z.ZodType<ExerciseDraftInput>;

export const EXERCISE_FORM_FIELDS = {
  exercise: "exercise",
  video: "video",
} as const;

export type ExerciseRequest = z.infer<typeof exerciseRequestSchema>;

export const exerciseLifecycleAnswerSchema = z.object({ name: z.string() });

export const exerciseSavedAnswerSchema = z.object({
  redirectTo: z.string().regex(/^\/(?!\/)/),
});

const exerciseProblemsSchema = z.object({
  name: z.enum(["missing", "too-long", "taken"]).optional(),
  type: z.enum(["unknown"]).optional(),
  unit: z.enum(["unknown", "not-allowed"]).optional(),
  primaryMuscles: z.enum(["missing", "unknown"]).optional(),
  secondaryMuscles: z.enum(["unknown", "overlap"]).optional(),
  equipment: z.enum(["unknown"]).optional(),
  difficulty: z.enum(["unknown"]).optional(),
  tags: z.enum(["unknown"]).optional(),
  cues: z.enum(["too-long"]).optional(),
  video: z.enum(["unsupported", "too-large"]).optional(),
}) satisfies z.ZodType<ExerciseSaveProblems>;

export type ExerciseProblems = z.infer<typeof exerciseProblemsSchema>;

export const exerciseProblemsAnswerSchema = z.object({
  problems: exerciseProblemsSchema,
});

export function presentExercise(exercise: Exercise): ExerciseView {
  const {
    ownerAccountId: _ownerAccountId,
    archivedAt: _archivedAt,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    video,
    ...view
  } = exercise.toSnapshot();

  return {
    ...view,
    video: video && {
      path: exerciseVideoPath(view.id, video.videoId),
      format: video.format,
    },
    status: exercise.status,
  };
}
