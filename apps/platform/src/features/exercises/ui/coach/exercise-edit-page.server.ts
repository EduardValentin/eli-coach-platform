import type { LoaderFunctionArgs } from "react-router";

import {
  exerciseMutationResponseSchema,
  type ExerciseWire,
} from "~/features/exercises/contracts/exercises";
import { getPlatformContainer } from "~/server/container.server";

export async function loader(args: LoaderFunctionArgs): Promise<ExerciseWire> {
  const response =
    await getPlatformContainer().exerciseLibraryController.getExercise(
      args,
      args.params.exerciseId,
    );

  if (!response.ok) {
    throw response;
  }

  const parsed = exerciseMutationResponseSchema.parse(await response.json());

  if (!parsed.success) {
    throw new Response(parsed.error.message, { status: 503 });
  }

  return parsed.exercise;
}
