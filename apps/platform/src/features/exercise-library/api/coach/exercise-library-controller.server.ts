import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  MAX_EXERCISE_VIDEO_BYTES,
  type CreateExerciseUseCase,
  type EditExerciseUseCase,
  type ExerciseDraftInput,
  type ExerciseSaveProblems,
  type ExerciseVideoChoice,
  type ExerciseVideoViewer,
  type FindExerciseUseCase,
  type ListExercisesUseCase,
  type OpenExerciseVideoUseCase,
  type StageExerciseVideoUseCase,
  type StagedExerciseVideo,
} from "@eli-coach-platform/domain/exercise";
import {
  createBadRequestResponse,
  createPrivateMediaResponse,
  isFormDataRequest,
  parseByteRange,
  readJsonRequestBody,
  readStreamingFormData,
} from "@eli-coach-platform/infrastructure/http/server";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  EXERCISE_FORM_FIELDS,
  exerciseProblemsAnswerSchema,
  exerciseRequestSchema,
  exerciseSavedAnswerSchema,
  presentExercise,
  type ExerciseEditorView,
  type ExerciseLibraryView,
} from "~/features/exercise-library/public/exercises";
import { COACH_TRAINING_PATH } from "~/features/exercise-library/public/paths";

type ExerciseLibraryControllerOptions = {
  listExercises: ListExercisesUseCase;
  findExercise: FindExerciseUseCase;
  createExercise: CreateExerciseUseCase;
  editExercise: EditExerciseUseCase;
  stageExerciseVideo: StageExerciseVideoUseCase;
  openExerciseVideo: OpenExerciseVideoUseCase;
};

type ExerciseVideoAddress = {
  exerciseId: string | undefined;
  videoId: string | undefined;
};

type ExerciseSave =
  | { status: "read"; draft: ExerciseDraftInput; video: ExerciseVideoChoice }
  | { status: "malformed" }
  | { status: "too-large" };

const EXERCISE_REQUEST_MAX_BYTES = 32 * 1024;

const MULTIPART_ALLOWANCE_BYTES = 1024 * 1024;

const MALFORMED_SAVE: ExerciseSave = { status: "malformed" };

const TOO_LARGE_SAVE: ExerciseSave = { status: "too-large" };

const idSchema = z.uuid();

export class ExerciseLibraryController {
  constructor(private readonly options: ExerciseLibraryControllerOptions) {}

  async list(args: LoaderFunctionArgs): Promise<ExerciseLibraryView> {
    requirePortalAccess(args, { role: "COACH" });
    const { exercises } = await this.options.listExercises.execute();

    return { exercises: exercises.map(presentExercise) };
  }

  async loadNew(args: LoaderFunctionArgs): Promise<ExerciseEditorView> {
    requirePortalAccess(args, { role: "COACH" });
    const { exercises } = await this.options.listExercises.execute();

    return {
      exercise: null,
      otherNames: exercises.map((exercise) => exercise.name),
    };
  }

  async load(
    args: LoaderFunctionArgs,
    exerciseId: string | undefined,
  ): Promise<ExerciseEditorView> {
    requirePortalAccess(args, { role: "COACH" });
    const id = idSchema.safeParse(exerciseId);

    if (!id.success) {
      throw this.backToLibrary();
    }

    const found = await this.options.findExercise.execute(id.data);

    if (found.status === "not-found") {
      throw this.backToLibrary();
    }

    return {
      exercise: presentExercise(found.exercise),
      otherNames: found.otherNames,
    };
  }

  async create(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const save = await this.readSave(args.request);

    if (save.status !== "read") {
      return this.unreadSaveResponse(save);
    }

    const result = await this.options.createExercise.execute({
      draft: save.draft,
      video: save.video,
    });

    switch (result.status) {
      case "created":
        return this.savedResponse();
      case "invalid":
        return this.problemsResponse(result.problems);
      case "failed":
        return this.serverErrorResponse();
    }
  }

  async edit(
    args: ActionFunctionArgs,
    exerciseId: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const id = idSchema.safeParse(exerciseId);

    if (!id.success) {
      return this.notFoundResponse();
    }

    const save = await this.readSave(args.request);

    if (save.status !== "read") {
      return this.unreadSaveResponse(save);
    }

    const result = await this.options.editExercise.execute({
      exerciseId: id.data,
      draft: save.draft,
      video: save.video,
    });

    switch (result.status) {
      case "edited":
        return this.savedResponse();
      case "invalid":
        return this.problemsResponse(result.problems);
      case "not-found":
        return this.notFoundResponse();
      case "failed":
        return this.serverErrorResponse();
    }
  }

  async openVideo(
    args: LoaderFunctionArgs,
    address: ExerciseVideoAddress,
  ): Promise<Response> {
    const exerciseId = idSchema.safeParse(address.exerciseId);
    const videoId = idSchema.safeParse(address.videoId);

    if (!exerciseId.success || !videoId.success) {
      return this.notFoundResponse();
    }

    const result = await this.options.openExerciseVideo.execute({
      viewer: this.viewerOf(args),
      exerciseId: exerciseId.data,
      videoId: videoId.data,
      requested: parseByteRange(args.request.headers.get("Range")),
    });

    if (result.status === "not-found") {
      return this.notFoundResponse();
    }

    return createPrivateMediaResponse(result);
  }

  private viewerOf(args: LoaderFunctionArgs): ExerciseVideoViewer {
    const session = args.context.get(sessionContext);

    if (session.kind === "anonymous") {
      return { kind: "visitor" };
    }

    return this.viewerFor(session.account);
  }

  private viewerFor(account: AccountSnapshot): ExerciseVideoViewer {
    switch (account.role) {
      case "COACH":
        return { kind: "coach" };
      case "CLIENT":
        return { kind: "client", authSubjectId: account.authSubjectId };
    }
  }

  private async readSave(request: Request): Promise<ExerciseSave> {
    if (isFormDataRequest(request)) {
      return this.readMultipartSave(request);
    }

    const body = await readJsonRequestBody(request, {
      maxBytes: EXERCISE_REQUEST_MAX_BYTES,
    });

    return this.saveOf(body, null);
  }

  private async readMultipartSave(request: Request): Promise<ExerciseSave> {
    const form = await readStreamingFormData(request, {
      maxTotalBytes: MAX_EXERCISE_VIDEO_BYTES + MULTIPART_ALLOWANCE_BYTES,
      fileField: EXERCISE_FORM_FIELDS.video,
      receiveFile: (bytes) => this.options.stageExerciseVideo.execute(bytes),
    });

    if (form.status !== "valid") {
      await this.discardStaged(form.received);

      return form.status === "too_large" ? TOO_LARGE_SAVE : MALFORMED_SAVE;
    }

    const exercisePart = form.fields.get(EXERCISE_FORM_FIELDS.exercise);
    const save = this.saveOf(this.jsonOf(exercisePart), form.received);

    if (save.status !== "read") {
      await this.discardStaged(form.received);
    }

    return save;
  }

  private saveOf(
    body: unknown,
    staged: StagedExerciseVideo | null,
  ): ExerciseSave {
    const request = exerciseRequestSchema.safeParse(body);

    if (!request.success) {
      return MALFORMED_SAVE;
    }

    const { video, ...draft } = request.data;

    if (staged) {
      return video === "attach"
        ? { status: "read", draft, video: { kind: "attach", staged } }
        : MALFORMED_SAVE;
    }

    return video === "attach"
      ? MALFORMED_SAVE
      : { status: "read", draft, video: { kind: video } };
  }

  private async discardStaged(staged: StagedExerciseVideo | null) {
    if (staged) {
      await this.options.stageExerciseVideo.discard(staged);
    }
  }

  private jsonOf(text: string | undefined): unknown {
    if (text === undefined || text.length > EXERCISE_REQUEST_MAX_BYTES) {
      return undefined;
    }

    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  private unreadSaveResponse(
    save: Exclude<ExerciseSave, { status: "read" }>,
  ): Response {
    if (save.status === "too-large") {
      return Response.json(
        exerciseProblemsAnswerSchema.parse({
          problems: { video: "too-large" },
        }),
        { status: 413 },
      );
    }

    return createBadRequestResponse("The exercise could not be read.");
  }

  private backToLibrary(): Response {
    return redirect(COACH_TRAINING_PATH);
  }

  private savedResponse(): Response {
    return Response.json(
      exerciseSavedAnswerSchema.parse({ redirectTo: COACH_TRAINING_PATH }),
    );
  }

  private problemsResponse(problems: ExerciseSaveProblems): Response {
    return Response.json(exerciseProblemsAnswerSchema.parse({ problems }), {
      status: 422,
    });
  }

  private notFoundResponse(): Response {
    return new Response("Not Found", { status: 404 });
  }

  private serverErrorResponse(): Response {
    return new Response("Internal Server Error", { status: 500 });
  }
}
