import type { APIRequestContext } from "@playwright/test";

import { answerOf, type ApiAnswer } from "./api-answers";

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

  async edit(recipeId: string, fields: RecipeFields): Promise<ApiAnswer> {
    return answerOf(
      await this.request.put(`${RECIPES_PATH}/${recipeId}`, { data: fields }),
    );
  }
}
