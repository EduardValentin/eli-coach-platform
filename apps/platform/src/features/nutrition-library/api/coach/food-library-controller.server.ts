import type {
  CreateFoodUseCase,
  EditFoodUseCase,
  FindFoodUseCase,
  FoodDraftProblems,
  ListFoodsUseCase,
} from "@eli-coach-platform/domain/nutrition";
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
  foodProblemsAnswerSchema,
  foodRequestSchema,
  foodSavedAnswerSchema,
  presentFood,
  presentTag,
  type FoodEditorView,
  type FoodLibraryView,
} from "~/features/nutrition-library/public/foods";
import { COACH_NUTRITION_PATH } from "~/features/nutrition-library/public/paths";

type FoodLibraryControllerOptions = {
  listFoods: ListFoodsUseCase;
  findFood: FindFoodUseCase;
  createFood: CreateFoodUseCase;
  editFood: EditFoodUseCase;
};

const FOOD_REQUEST_MAX_BYTES = 16 * 1024;

const idSchema = z.uuid();

export class FoodLibraryController {
  constructor(private readonly options: FoodLibraryControllerOptions) {}

  async list(args: LoaderFunctionArgs): Promise<FoodLibraryView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const { foods, tags } = await this.options.listFoods.execute(coach.id);

    return { foods: foods.map(presentFood), tags: tags.map(presentTag) };
  }

  async loadNew(args: LoaderFunctionArgs): Promise<FoodEditorView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const { foods, tags } = await this.options.listFoods.execute(coach.id);

    return {
      food: null,
      otherNames: foods.map((food) => food.name),
      tags: tags.map(presentTag),
    };
  }

  async load(
    args: LoaderFunctionArgs,
    foodId: string | undefined,
  ): Promise<FoodEditorView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const id = idSchema.safeParse(foodId);

    if (!id.success) {
      throw this.backToLibrary();
    }

    const found = await this.options.findFood.execute({
      ownerAccountId: coach.id,
      foodId: id.data,
    });

    if (found.status === "not-found") {
      throw this.backToLibrary();
    }

    return {
      food: presentFood(found.food),
      otherNames: found.otherNames,
      tags: found.tags.map(presentTag),
    };
  }

  async create(args: ActionFunctionArgs): Promise<Response> {
    const coach = requireApiAccount(args, { role: "COACH" });
    const draft = await this.readDraft(args.request);

    if (!draft.success) {
      return createBadRequestResponse("The food could not be read.");
    }

    const result = await this.options.createFood.execute({
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
    foodId: string | undefined,
  ): Promise<Response> {
    const coach = requireApiAccount(args, { role: "COACH" });
    const id = idSchema.safeParse(foodId);

    if (!id.success) {
      return this.notFoundResponse();
    }

    const draft = await this.readDraft(args.request);

    if (!draft.success) {
      return createBadRequestResponse("The food could not be read.");
    }

    const result = await this.options.editFood.execute({
      ownerAccountId: coach.id,
      foodId: id.data,
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
    return foodRequestSchema.safeParse(
      await readJsonRequestBody(request, { maxBytes: FOOD_REQUEST_MAX_BYTES }),
    );
  }

  private backToLibrary(): Response {
    return redirect(COACH_NUTRITION_PATH);
  }

  private savedResponse(): Response {
    return Response.json(
      foodSavedAnswerSchema.parse({ redirectTo: COACH_NUTRITION_PATH }),
    );
  }

  private problemsResponse(problems: FoodDraftProblems): Response {
    return Response.json(foodProblemsAnswerSchema.parse({ problems }), {
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
