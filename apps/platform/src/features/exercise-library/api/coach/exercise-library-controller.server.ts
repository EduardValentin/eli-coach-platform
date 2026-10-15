import type {
  CreateExerciseUseCase,
  EditExerciseUseCase,
  ExerciseDraftProblems,
  FindExerciseUseCase,
  ListExercisesUseCase,
} from "@eli-coach-platform/domain/exercise";
import {
  createBadRequestResponse,
  readJsonRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
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
};

const EXERCISE_REQUEST_MAX_BYTES = 32 * 1024;

const idSchema = z.uuid();

export class ExerciseLibraryController {
  constructor(private readonly options: ExerciseLibraryControllerOptions) {}

  async list(args: LoaderFunctionArgs): Promise<ExerciseLibraryView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const { exercises } = await this.options.listExercises.execute(coach.id);

    return { exercises: exercises.map(presentExercise) };
  }

  async loadNew(args: LoaderFunctionArgs): Promise<ExerciseEditorView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const { exercises } = await this.options.listExercises.execute(coach.id);

    return {
      exercise: null,
      otherNames: exercises.map((exercise) => exercise.name),
    };
  }

  async load(
    args: LoaderFunctionArgs,
    exerciseId: string | undefined,
  ): Promise<ExerciseEditorView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const id = idSchema.safeParse(exerciseId);

    if (!id.success) {
      throw this.backToLibrary();
    }

    const found = await this.options.findExercise.execute({
      ownerAccountId: coach.id,
      exerciseId: id.data,
    });

    if (found.status === "not-found") {
      throw this.backToLibrary();
    }

    return {
      exercise: presentExercise(found.exercise),
      otherNames: found.otherNames,
    };
  }

  async create(args: ActionFunctionArgs): Promise<Response> {
    const coach = requireApiAccount(args, { role: "COACH" });
    const draft = await this.readDraft(args.request);

    if (!draft.success) {
      return createBadRequestResponse("The exercise could not be read.");
    }

    const result = await this.options.createExercise.execute({
      ownerAccountId: coach.id,
      draft: draft.data,
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
    const coach = requireApiAccount(args, { role: "COACH" });
    const id = idSchema.safeParse(exerciseId);

    if (!id.success) {
      return this.notFoundResponse();
    }

    const draft = await this.readDraft(args.request);

    if (!draft.success) {
      return createBadRequestResponse("The exercise could not be read.");
    }

    const result = await this.options.editExercise.execute({
      ownerAccountId: coach.id,
      exerciseId: id.data,
      draft: draft.data,
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

  private async readDraft(request: Request) {
    return exerciseRequestSchema.safeParse(
      await readJsonRequestBody(request, {
        maxBytes: EXERCISE_REQUEST_MAX_BYTES,
      }),
    );
  }

  private backToLibrary(): Response {
    return redirect(COACH_TRAINING_PATH);
  }

  private savedResponse(): Response {
    return Response.json(
      exerciseSavedAnswerSchema.parse({ redirectTo: COACH_TRAINING_PATH }),
    );
  }

  private problemsResponse(problems: ExerciseDraftProblems): Response {
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
