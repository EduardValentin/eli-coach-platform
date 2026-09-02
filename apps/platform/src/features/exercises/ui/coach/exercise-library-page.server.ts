import type { LoaderFunctionArgs } from "react-router";

import {
  exerciseListResponseSchema,
  type ExerciseWire,
} from "~/features/exercises/contracts/exercises";
import { getPlatformContainer } from "~/server/container.server";

export type ExerciseLibraryLoaderData = { exercises: readonly ExerciseWire[] };

export async function loader(
  args: LoaderFunctionArgs,
): Promise<ExerciseLibraryLoaderData> {
  const response =
    await getPlatformContainer().exerciseLibraryController.listExercises(args);

  if (!response.ok) {
    throw response;
  }

  const parsed = exerciseListResponseSchema.parse(await response.json());

  if (!parsed.success) {
    throw new Response(parsed.error.message, { status: 503 });
  }

  return { exercises: parsed.exercises };
}
