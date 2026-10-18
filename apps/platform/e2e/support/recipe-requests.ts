import type { APIRequestContext } from "@playwright/test";

import { answerOf, type ApiAnswer } from "./api-answers";
import type { SamplePhoto } from "./sample-photos";

type RecipeIngredientFields = {
  foodId: string;
  grams: number;
  method: string;
};

export type RecipeFields = {
  name: string;
  ingredients: readonly RecipeIngredientFields[];
  prepMinutes: number;
  cookMinutes: number;
  instructions: string;
  icon: string | null;
  tagIds: readonly string[];
};

export type ServedRecipePhoto = {
  status: number;
  contentType: string | undefined;
  headers: Readonly<Record<string, string>>;
  bytes: Buffer;
};

const RECIPES_PATH = "/api/coach/recipes";

const SAVED = 200;

export class RecipeRequests {
  constructor(private readonly request: APIRequestContext) {}

  async create(fields: RecipeFields): Promise<ApiAnswer> {
    return answerOf(await this.request.post(RECIPES_PATH, { data: fields }));
  }

  async createAccepted(fields: RecipeFields): Promise<void> {
    const answer = await this.create(fields);

    if (answer.status !== SAVED) {
      throw new Error(
        `Creating ${fields.name} answered ${answer.status}: ${JSON.stringify(answer.body)}.`,
      );
    }
  }

  async createWithPhoto(
    fields: RecipeFields,
    photo: SamplePhoto,
  ): Promise<ApiAnswer> {
    return answerOf(
      await this.request.post(RECIPES_PATH, {
        multipart: {
          recipe: JSON.stringify({ ...fields, photo: "attach" }),
          photo,
        },
      }),
    );
  }

  async createWithPhotoAccepted(
    fields: RecipeFields,
    photo: SamplePhoto,
  ): Promise<void> {
    const answer = await this.createWithPhoto(fields, photo);

    if (answer.status !== SAVED) {
      throw new Error(
        `Creating ${fields.name} with a photo answered ${answer.status}: ${JSON.stringify(answer.body)}.`,
      );
    }
  }

  async openPhoto(photoPath: string): Promise<ServedRecipePhoto> {
    const response = await this.request.get(photoPath);

    return {
      status: response.status(),
      contentType: response.headers()["content-type"],
      headers: response.headers(),
      bytes: await response.body(),
    };
  }

  async edit(recipeId: string, fields: RecipeFields): Promise<ApiAnswer> {
    return answerOf(
      await this.request.put(`${RECIPES_PATH}/${recipeId}`, { data: fields }),
    );
  }
}
