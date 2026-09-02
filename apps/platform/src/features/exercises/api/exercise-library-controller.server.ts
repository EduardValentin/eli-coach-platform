import { joinBasePath } from "@eli-coach-platform/config";
import {
  MAX_EXERCISE_VIDEO_BYTES,
  type Exercise,
  type ExerciseIssue,
  type ExerciseLibraryService,
  type ExerciseVideoInput,
  type SaveExerciseResult,
} from "@eli-coach-platform/domain";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/require-account.server";
import {
  exerciseDraftSchema,
  exerciseIdSchema,
  exerciseListResponseSchema,
  exerciseMutationResponseSchema,
  exerciseUpdateMetadataSchema,
  type ExerciseDraftInput,
  type ExerciseErrorCode,
  type ExerciseWire,
} from "~/features/exercises/contracts/exercises";
import { readFormDataRequestBody } from "~/server/http.server";

/** A full-size video plus the metadata field and multipart framing. */
export const MAX_EXERCISE_UPLOAD_BYTES = MAX_EXERCISE_VIDEO_BYTES + 256 * 1024;
const MEGABYTE = 1024 * 1024;
const UNAVAILABLE_MESSAGE = "The exercise library is temporarily unavailable.";
const UNKNOWN_MESSAGE = "Unknown exercise.";

type ExerciseLibraryControllerOptions = {
  appBasePath: string;
  service: ExerciseLibraryService;
};

type GuardedArgs = Pick<LoaderFunctionArgs, "context">;

type ParsedPayload = { draft: ExerciseDraftInput; video: ExerciseVideoInput };

type PayloadParse =
  | { status: "parsed"; payload: ParsedPayload }
  | { status: "rejected"; response: Response };

type FormDataRead =
  | { status: "read"; formData: FormData }
  | { status: "rejected"; response: Response };

type MetadataIssue = { message: string; path: readonly PropertyKey[] };

type MetadataSchema<Value> = {
  safeParse(value: unknown):
    | { success: true; data: Value }
    | { success: false; error: { issues: readonly MetadataIssue[] } };
};

type MetadataParse<Value> =
  | { status: "parsed"; value: Value }
  | { status: "rejected"; response: Response };

export class ExerciseLibraryController {
  constructor(private readonly options: ExerciseLibraryControllerOptions) {}

  async listExercises(args: GuardedArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const result = await this.options.service.listExercises();

    if (result.status === "unavailable") {
      return errorResponse("server_error", UNAVAILABLE_MESSAGE, 503);
    }

    return Response.json(
      exerciseListResponseSchema.parse({
        success: true,
        exercises: result.exercises.map((exercise) => this.toWire(exercise)),
      }),
    );
  }

  async getExercise(
    args: GuardedArgs,
    exerciseIdParameter: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const exerciseId = exerciseIdSchema.safeParse(exerciseIdParameter);

    if (!exerciseId.success) {
      return errorResponse("not_found", UNKNOWN_MESSAGE, 404);
    }

    const result = await this.options.service.getExercise(exerciseId.data);

    if (result.status === "not_found") {
      return errorResponse("not_found", UNKNOWN_MESSAGE, 404);
    }

    if (result.status === "unavailable") {
      return errorResponse("server_error", UNAVAILABLE_MESSAGE, 503);
    }

    return Response.json(
      exerciseMutationResponseSchema.parse({
        success: true,
        exercise: this.toWire(result.exercise),
      }),
    );
  }

  async createExercise(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const parsed = await parseCreatePayload(args.request);

    if (parsed.status === "rejected") {
      return parsed.response;
    }

    return this.saveResponse(
      await this.options.service.createExercise(parsed.payload),
      201,
    );
  }

  async updateExercise(
    args: ActionFunctionArgs,
    exerciseIdParameter: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const exerciseId = exerciseIdSchema.safeParse(exerciseIdParameter);

    if (!exerciseId.success) {
      return errorResponse("not_found", UNKNOWN_MESSAGE, 404);
    }

    const parsed = await parseUpdatePayload(args.request);

    if (parsed.status === "rejected") {
      return parsed.response;
    }

    return this.saveResponse(
      await this.options.service.updateExercise(exerciseId.data, parsed.payload),
      200,
    );
  }

  private saveResponse(result: SaveExerciseResult, savedStatus: number): Response {
    if (result.status === "unavailable") {
      return errorResponse("server_error", UNAVAILABLE_MESSAGE, 503);
    }

    if (result.status === "not_found") {
      return errorResponse("not_found", UNKNOWN_MESSAGE, 404);
    }

    if (result.status === "invalid") {
      return validationFailureResponse(result.issues.map(describeIssue));
    }

    return Response.json(
      exerciseMutationResponseSchema.parse({
        success: true,
        exercise: this.toWire(result.exercise),
      }),
      { status: savedStatus },
    );
  }

  private toWire(exercise: Exercise): ExerciseWire {
    return {
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      difficulty: exercise.difficulty,
      equipment: [...exercise.equipment],
      primaryMuscles: [...exercise.primaryMuscles],
      secondaryMuscles: [...exercise.secondaryMuscles],
      tags: [...exercise.tags],
      video: exercise.video
        ? {
            url: joinBasePath(
              this.options.appBasePath,
              `/api/exercises/videos/${encodeURIComponent(exercise.video.assetKey)}`,
            ),
            sizeBytes: exercise.video.sizeBytes,
          }
        : null,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    };
  }
}

async function parseCreatePayload(request: Request): Promise<PayloadParse> {
  const body = await readExerciseFormData(request);

  if (body.status === "rejected") {
    return body;
  }

  const metadata = parseMetadata(body.formData, exerciseDraftSchema);

  if (metadata.status === "rejected") {
    return metadata;
  }

  return {
    status: "parsed",
    payload: {
      draft: metadata.value,
      video: await readVideoInput(body.formData, "keep"),
    },
  };
}

async function parseUpdatePayload(request: Request): Promise<PayloadParse> {
  const body = await readExerciseFormData(request);

  if (body.status === "rejected") {
    return body;
  }

  const metadata = parseMetadata(body.formData, exerciseUpdateMetadataSchema);

  if (metadata.status === "rejected") {
    return metadata;
  }

  const { video, ...draft } = metadata.value;

  return {
    status: "parsed",
    payload: { draft, video: await readVideoInput(body.formData, video) },
  };
}

async function readExerciseFormData(request: Request): Promise<FormDataRead> {
  const body = await readFormDataRequestBody(request, {
    maxBytes: MAX_EXERCISE_UPLOAD_BYTES,
  });

  if (body.status === "too_large") {
    return {
      status: "rejected",
      response: errorResponse(
        "payload_too_large",
        `A demonstration video may not exceed ${MAX_EXERCISE_VIDEO_BYTES / MEGABYTE} MB.`,
        413,
      ),
    };
  }

  if (body.status === "invalid") {
    return {
      status: "rejected",
      response: errorResponse(
        "invalid_request",
        "Expected a multipart exercise payload.",
        400,
      ),
    };
  }

  return { status: "read", formData: body.formData };
}

function parseMetadata<Value>(
  formData: FormData,
  schema: MetadataSchema<Value>,
): MetadataParse<Value> {
  const raw = formData.get("metadata");

  if (typeof raw !== "string") {
    return {
      status: "rejected",
      response: errorResponse(
        "invalid_request",
        "Expected a metadata field carrying JSON.",
        400,
      ),
    };
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    return {
      status: "rejected",
      response: errorResponse(
        "invalid_request",
        "The metadata field is not valid JSON.",
        400,
      ),
    };
  }

  const parsed = schema.safeParse(decoded);

  if (!parsed.success) {
    return {
      status: "rejected",
      response: validationFailureResponse(
        parsed.error.issues.map((issue) => ({
          code: "invalid_metadata",
          message: issue.message,
          path: issue.path.map(String),
        })),
      ),
    };
  }

  return { status: "parsed", value: parsed.data };
}

async function readVideoInput(
  formData: FormData,
  disposition: "keep" | "remove",
): Promise<ExerciseVideoInput> {
  const entry = formData.get("video");

  if (entry !== null && typeof entry !== "string") {
    return {
      kind: "replace",
      bytes: new Uint8Array(await entry.arrayBuffer()),
      filename: entry.name,
    };
  }

  return { kind: disposition };
}

function describeIssue(issue: ExerciseIssue): Record<string, unknown> {
  if (issue.code === "video_too_large") {
    return {
      code: issue.code,
      maxBytes: issue.maxBytes,
      message: `The video must be ${issue.maxBytes / MEGABYTE} MB or smaller.`,
      path: ["video"],
      sizeBytes: issue.sizeBytes,
    };
  }

  return {
    code: issue.code,
    message: "Only .mp4 videos are supported.",
    path: ["video"],
  };
}

function validationFailureResponse(
  issues: readonly Record<string, unknown>[],
): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: "validation_failed",
        issues,
        message: "The exercise was rejected.",
      },
    },
    { status: 400 },
  );
}

function errorResponse(
  code: ExerciseErrorCode,
  message: string,
  status: number,
): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status },
  );
}
