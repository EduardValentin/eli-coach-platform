import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  MAX_RECIPE_PHOTO_BYTES,
  type CreateRecipeUseCase,
  type EditRecipeUseCase,
  type FindRecipeUseCase,
  type ListRecipesUseCase,
  type OpenRecipePhotoUseCase,
  type RecipeDraftInput,
  type RecipePhotoChoice,
  type RecipePhotoViewer,
  type RecipeSaveProblems,
  type StartRecipeUseCase,
} from "@eli-coach-platform/domain/nutrition";
import {
  createBadRequestResponse,
  createPrivateMediaResponse,
  isFormDataRequest,
  readFormDataRequestBody,
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
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import { COACH_RECIPES_PATH } from "~/features/nutrition-library/public/paths";
import {
  RECIPE_FORM_FIELDS,
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
  openRecipePhoto: OpenRecipePhotoUseCase;
};

type RecipePhotoAddress = {
  recipeId: string | undefined;
  photoId: string | undefined;
};

type RecipeSave =
  | { status: "read"; draft: RecipeDraftInput; photo: RecipePhotoChoice }
  | { status: "malformed" }
  | { status: "too-large" };

const RECIPE_REQUEST_MAX_BYTES = 64 * 1024;

const MULTIPART_ALLOWANCE_BYTES = 1024 * 1024;

const MALFORMED_SAVE: RecipeSave = { status: "malformed" };

const TOO_LARGE_SAVE: RecipeSave = { status: "too-large" };

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
    const save = await this.readSave(args.request);

    if (save.status !== "read") {
      return this.unreadSaveResponse(save);
    }

    const result = await this.options.createRecipe.execute({
      ownerAccountId: coach.id,
      draft: save.draft,
      photo: save.photo,
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

    const save = await this.readSave(args.request);

    if (save.status !== "read") {
      return this.unreadSaveResponse(save);
    }

    const result = await this.options.editRecipe.execute({
      ownerAccountId: coach.id,
      recipeId: id.data,
      draft: save.draft,
      photo: save.photo,
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

  async openPhoto(
    args: LoaderFunctionArgs,
    address: RecipePhotoAddress,
  ): Promise<Response> {
    const recipeId = idSchema.safeParse(address.recipeId);
    const photoId = idSchema.safeParse(address.photoId);

    if (!recipeId.success || !photoId.success) {
      return this.notFoundResponse();
    }

    const result = await this.options.openRecipePhoto.execute({
      viewer: this.viewerOf(args),
      recipeId: recipeId.data,
      photoId: photoId.data,
    });

    if (result.status === "not-found") {
      return this.notFoundResponse();
    }

    return createPrivateMediaResponse({ ...result, served: "whole" });
  }

  private viewerOf(args: LoaderFunctionArgs): RecipePhotoViewer {
    const session = args.context.get(sessionContext);

    if (session.kind === "anonymous") {
      return { kind: "visitor" };
    }

    return this.viewerFor(session.account);
  }

  private viewerFor(account: AccountSnapshot): RecipePhotoViewer {
    switch (account.role) {
      case "COACH":
        return { kind: "coach", accountId: account.id };
      case "CLIENT":
        return { kind: "client", authSubjectId: account.authSubjectId };
    }
  }

  private async readSave(request: Request): Promise<RecipeSave> {
    if (isFormDataRequest(request)) {
      return this.readMultipartSave(request);
    }

    const body = await readJsonRequestBody(request, {
      maxBytes: RECIPE_REQUEST_MAX_BYTES,
    });

    return this.saveOf(body, null);
  }

  private async readMultipartSave(request: Request): Promise<RecipeSave> {
    const body = await readFormDataRequestBody(request, {
      maxBytes: MAX_RECIPE_PHOTO_BYTES + MULTIPART_ALLOWANCE_BYTES,
    });

    if (body.status === "too_large") return TOO_LARGE_SAVE;
    if (body.status === "invalid") return MALFORMED_SAVE;

    const recipePart = body.formData.get(RECIPE_FORM_FIELDS.recipe);
    const photoPart = body.formData.get(RECIPE_FORM_FIELDS.photo);
    const photoBytes =
      photoPart instanceof File
        ? new Uint8Array(await photoPart.arrayBuffer())
        : null;

    return this.saveOf(this.jsonOf(recipePart), photoBytes);
  }

  private saveOf(body: unknown, photoBytes: Uint8Array | null): RecipeSave {
    const request = recipeRequestSchema.safeParse(body);

    if (!request.success) {
      return MALFORMED_SAVE;
    }

    const { photo, ...draft } = request.data;

    if (photoBytes) {
      return photo === "attach"
        ? {
            status: "read",
            draft,
            photo: { kind: "attach", bytes: photoBytes },
          }
        : MALFORMED_SAVE;
    }

    return photo === "attach"
      ? MALFORMED_SAVE
      : { status: "read", draft, photo: { kind: photo } };
  }

  private jsonOf(part: FormDataEntryValue | null): unknown {
    if (typeof part !== "string" || part.length > RECIPE_REQUEST_MAX_BYTES) {
      return undefined;
    }

    try {
      return JSON.parse(part);
    } catch {
      return undefined;
    }
  }

  private unreadSaveResponse(
    save: Exclude<RecipeSave, { status: "read" }>,
  ): Response {
    if (save.status === "too-large") {
      return Response.json(
        recipeProblemsAnswerSchema.parse({ problems: { photo: "too-large" } }),
        { status: 413 },
      );
    }

    return createBadRequestResponse("The recipe could not be read.");
  }

  private backToRecipes(): Response {
    return redirect(COACH_RECIPES_PATH);
  }

  private savedResponse(): Response {
    return Response.json(
      recipeSavedAnswerSchema.parse({ redirectTo: COACH_RECIPES_PATH }),
    );
  }

  private problemsResponse(problems: RecipeSaveProblems): Response {
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
