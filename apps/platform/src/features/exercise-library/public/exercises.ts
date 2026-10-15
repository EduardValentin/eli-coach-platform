import type {
  Exercise,
  ExerciseDraftInput,
  ExerciseDraftProblems,
  ExerciseSnapshot,
} from "@eli-coach-platform/domain/exercise";
import { z } from "zod";

export type ExerciseView = Omit<ExerciseSnapshot, "createdAt" | "updatedAt">;

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
}) satisfies z.ZodType<ExerciseDraftInput>;

export type ExerciseRequest = z.infer<typeof exerciseRequestSchema>;

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
}) satisfies z.ZodType<ExerciseDraftProblems>;

export type ExerciseProblems = z.infer<typeof exerciseProblemsSchema>;

export const exerciseProblemsAnswerSchema = z.object({
  problems: exerciseProblemsSchema,
});

export function presentExercise(exercise: Exercise): ExerciseView {
  const {
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...view
  } = exercise.toSnapshot();

  return view;
}
