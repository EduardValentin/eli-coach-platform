import { z } from "zod";

import { isProductionRuntime, type AppConfig } from "./app";

const PLACEHOLDER_SECRET = "replace-me";

export const exerciseVideosShape = {
  EXERCISE_VIDEO_ROOT: z.string().trim().min(1),
};

export type ExerciseVideosConfig = z.infer<
  z.ZodObject<typeof exerciseVideosShape>
>;

export function refineExerciseVideos(
  environment: ExerciseVideosConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (
    !isProductionRuntime(environment) ||
    environment.EXERCISE_VIDEO_ROOT !== PLACEHOLDER_SECRET
  ) {
    return;
  }

  context.addIssue({
    code: "custom",
    message:
      "Production exercise videos require a non-placeholder EXERCISE_VIDEO_ROOT.",
    path: ["EXERCISE_VIDEO_ROOT"],
  });
}
