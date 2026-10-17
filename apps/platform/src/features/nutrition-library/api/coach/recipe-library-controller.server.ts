import type {
  CreateRecipeUseCase,
  EditRecipeUseCase,
  FindRecipeUseCase,
  ListRecipesUseCase,
  RecipeDraftProblems,
  StartRecipeUseCase,
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
import { COACH_RECIPES_PATH } from "~/features/nutrition-library/public/paths";
import {
  presentRecipeBuilder,
  presentRecipeCard,
  recipeProblemsAnswerSchema,
  recipeRequestSchema,
  recipeSavedAnswerSchema,
  type RecipeBuilderView,
  type RecipeLibraryView,
} from "~/features/nutrition-library/public/recipes";

type RecipeLibraryControllerOptions = {
  listRecipes: ListRecipesUseCase;
  startRecipe: StartRecipeUseCase;
  findRecipe: FindRecipeUseCase;
  createRecipe: CreateRecipeUseCase;
  editRecipe: EditRecipeUseCase;
};

const RECIPE_REQUEST_MAX_BYTES = 64 * 1024;

const idSchema = z.uuid();

export class RecipeLibraryController {
  constructor(private readonly options: RecipeLibraryControllerOptions) {}

  async list(args: LoaderFunctionArgs): Promise<RecipeLibraryView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const { recipes, foods } = await this.options.listRecipes.execute(coach.id);

    return {
      recipes: recipes.map((recipe) => presentRecipeCard(recipe, foods)),
    };
  }

  async loadNew(args: LoaderFunctionArgs): Promise<RecipeBuilderView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const started = await this.options.startRecipe.execute(coach.id);

    return presentRecipeBuilder({ ...started, recipe: null });
  }

  async load(
    args: LoaderFunctionArgs,
    recipeId: string | undefined,
  ): Promise<RecipeBuilderView> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const id = idSchema.safeParse(recipeId);

    if (!id.success) {
      throw this.backToRecipes();
    }

    const found = await this.options.findRecipe.execute({
      ownerAccountId: coach.id,
      recipeId: id.data,
    });

    if (found.status === "not-found") {
      throw this.backToRecipes();
    }

    return presentRecipeBuilder(found);
  }

  async create(args: ActionFunctionArgs): Promise<Response> {
    const coach = requireApiAccount(args, { role: "COACH" });
    const draft = await this.readDraft(args.request);

    if (!draft.success) {
      return createBadRequestResponse("The recipe could not be read.");
    }

    const result = await this.options.createRecipe.execute({
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
    recipeId: string | undefined,
  ): Promise<Response> {
    const coach = requireApiAccount(args, { role: "COACH" });
    const id = idSchema.safeParse(recipeId);

    if (!id.success) {
      return this.notFoundResponse();
    }

    const draft = await this.readDraft(args.request);

    if (!draft.success) {
      return createBadRequestResponse("The recipe could not be read.");
    }

    const result = await this.options.editRecipe.execute({
      ownerAccountId: coach.id,
      recipeId: id.data,
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
    return recipeRequestSchema.safeParse(
      await readJsonRequestBody(request, {
        maxBytes: RECIPE_REQUEST_MAX_BYTES,
      }),
    );
  }

  private backToRecipes(): Response {
    return redirect(COACH_RECIPES_PATH);
  }

  private savedResponse(): Response {
    return Response.json(
      recipeSavedAnswerSchema.parse({ redirectTo: COACH_RECIPES_PATH }),
    );
  }

  private problemsResponse(problems: RecipeDraftProblems): Response {
    return Response.json(recipeProblemsAnswerSchema.parse({ problems }), {
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
