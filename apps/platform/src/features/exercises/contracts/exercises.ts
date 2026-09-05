import {
  areMuscleSelectionsDisjoint,
  EQUIPMENT_OPTIONS,
  EXERCISE_DESCRIPTION_MAX_LENGTH,
  EXERCISE_DIFFICULTIES,
  EXERCISE_NAME_MAX_LENGTH,
  EXERCISE_TAGS,
  MUSCLE_GROUPS,
} from "@eli-coach-platform/domain";
import { z } from "zod";

export const EXERCISE_NAME_REQUIRED_MESSAGE = "Exercise name is required";

const uniqueValues = (values: readonly string[]) =>
  new Set(values).size === values.length;

function selection<const Options extends readonly [string, ...string[]]>(
  options: Options,
) {
  return z
    .array(z.enum(options))
    .max(options.length)
    .refine(uniqueValues, { message: "Each option may be chosen once." });
}

export const exerciseDraftSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, EXERCISE_NAME_REQUIRED_MESSAGE)
      .max(
        EXERCISE_NAME_MAX_LENGTH,
        `Exercise name must be ${EXERCISE_NAME_MAX_LENGTH} characters or fewer`,
      ),
    description: z
      .string()
      .trim()
      .max(
        EXERCISE_DESCRIPTION_MAX_LENGTH,
        `Description must be ${EXERCISE_DESCRIPTION_MAX_LENGTH} characters or fewer`,
      ),
    difficulty: z.enum(EXERCISE_DIFFICULTIES),
    equipment: selection(EQUIPMENT_OPTIONS),
    primaryMuscles: selection(MUSCLE_GROUPS),
    secondaryMuscles: selection(MUSCLE_GROUPS),
    tags: selection(EXERCISE_TAGS),
  })
  .refine(
    (draft) =>
      areMuscleSelectionsDisjoint(draft.primaryMuscles, draft.secondaryMuscles),
    {
      message: "A muscle cannot be both primary and secondary.",
      path: ["secondaryMuscles"],
    },
  );

export const exerciseMetadataSchema = exerciseDraftSchema.extend({
  video: z.enum(["keep", "remove"]).default("keep"),
});

export const exerciseIdSchema = z.uuid();

const exerciseVideoWireSchema = z.object({
  url: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const exerciseSchema = z.object({
  id: exerciseIdSchema,
  name: z.string().min(1),
  description: z.string(),
  difficulty: z.enum(EXERCISE_DIFFICULTIES),
  equipment: z.array(z.enum(EQUIPMENT_OPTIONS)),
  primaryMuscles: z.array(z.enum(MUSCLE_GROUPS)),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)),
  tags: z.array(z.enum(EXERCISE_TAGS)),
  video: exerciseVideoWireSchema.nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const exerciseErrorCodeSchema = z.enum([
  "invalid_request",
  "validation_failed",
  "payload_too_large",
  "not_found",
  "server_error",
]);

const exerciseErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: exerciseErrorCodeSchema,
    message: z.string().min(1),
    issues: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
});

export const exerciseListResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), exercises: z.array(exerciseSchema) }),
  exerciseErrorResponseSchema,
]);

export const exerciseMutationResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), exercise: exerciseSchema }),
  exerciseErrorResponseSchema,
]);

export type ExerciseDraftInput = z.infer<typeof exerciseDraftSchema>;
export type ExerciseMetadata = z.infer<typeof exerciseMetadataSchema>;
export type ExerciseVideoWire = z.infer<typeof exerciseVideoWireSchema>;
export type ExerciseWire = z.infer<typeof exerciseSchema>;
export type ExerciseListResponse = z.infer<typeof exerciseListResponseSchema>;
export type ExerciseMutationResponse = z.infer<
  typeof exerciseMutationResponseSchema
>;
export type ExerciseErrorCode = z.infer<typeof exerciseErrorCodeSchema>;
