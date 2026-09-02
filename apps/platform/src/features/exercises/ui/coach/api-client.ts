import { joinBasePath } from "@eli-coach-platform/config";
import { useMutation } from "@tanstack/react-query";

import {
  exerciseMutationResponseSchema,
  type ExerciseDraftInput,
  type ExerciseMutationResponse,
} from "~/features/exercises/contracts/exercises";

export const EXERCISES_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  "/api/exercises",
);

export function exerciseApiUrl(exerciseId: string): string {
  return `${EXERCISES_API_URL}/${encodeURIComponent(exerciseId)}`;
}

export type SaveExerciseRequest = {
  draft: ExerciseDraftInput;
  video: { kind: "keep" } | { kind: "remove" } | { kind: "replace"; file: File };
};

export function useCreateExerciseMutation() {
  return useMutation({
    mutationFn: (request: SaveExerciseRequest) =>
      submitExercise({ method: "POST", request, url: EXERCISES_API_URL }),
  });
}

export function useUpdateExerciseMutation(exerciseId: string) {
  return useMutation({
    mutationFn: (request: SaveExerciseRequest) =>
      submitExercise({ method: "PATCH", request, url: exerciseApiUrl(exerciseId) }),
  });
}

async function submitExercise(options: {
  method: "POST" | "PATCH";
  request: SaveExerciseRequest;
  url: string;
}): Promise<ExerciseMutationResponse> {
  const { method, request, url } = options;
  const formData = new FormData();
  const metadata =
    method === "PATCH"
      ? { ...request.draft, video: request.video.kind === "remove" ? "remove" : "keep" }
      : request.draft;

  formData.set("metadata", JSON.stringify(metadata));

  if (request.video.kind === "replace") {
    formData.set("video", request.video.file, request.video.file.name);
  }

  try {
    const response = await fetch(url, {
      body: formData,
      headers: { Accept: "application/json" },
      method,
    });
    const parsed = exerciseMutationResponseSchema.safeParse(await response.json());

    return parsed.success ? parsed.data : createServerErrorResponse();
  } catch {
    return createServerErrorResponse();
  }
}

function createServerErrorResponse(): ExerciseMutationResponse {
  return {
    error: {
      code: "server_error",
      message: "The exercise could not be saved. Please try again.",
    },
    success: false,
  };
}
